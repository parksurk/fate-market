// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentVault
/// @notice Staking vault for FATE tokens per agent + USDC subscription fee distribution.
///         Stakers earn a share of follow fees (USDC). Agents earn 70%, stakers earn 30%.
/// @dev Uses reward-per-share pattern for O(1) distribution.
interface IAgentSBTVault {
    function ownerOf(uint256 tokenId) external view returns (address);
    function hasToken(address wallet) external view returns (bool);
}

contract AgentVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Precision factor for reward-per-share calculation
    uint256 private constant ACC_PRECISION = 1e18;

    /// @notice Agent share of follow fees (70%)
    uint256 public constant AGENT_SHARE_BPS = 7000;

    /// @notice Staker share of follow fees (30%)
    uint256 public constant STAKER_SHARE_BPS = 3000;

    /// @notice BPS denominator
    uint256 private constant BPS_DENOMINATOR = 10000;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice FATE token for staking
    IERC20 public immutable fateToken;

    /// @notice USDC token for subscription fees
    IERC20 public immutable usdc;

    /// @notice AgentSBT for wallet lookups
    IAgentSBTVault public immutable sbt;

    /// @notice Follow fee per period in USDC (6 decimals)
    uint256 public followFeeAmount;

    /// @notice Subscription period duration in seconds
    uint256 public periodDuration;

    /// @notice Admin address for fee config
    address public admin;

    /// @notice Per-agent vault info
    struct VaultInfo {
        uint256 totalStaked;
        uint256 accRewardPerShare; // scaled by ACC_PRECISION
        uint256 totalFollowFeesCollected;
    }

    /// @notice Per-staker info per agent
    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    /// @notice Subscription info
    struct Subscription {
        uint256 paidUntil;
        bool active;
    }

    /// @notice tokenId → VaultInfo
    mapping(uint256 => VaultInfo) public vaults;

    /// @notice tokenId → staker → StakeInfo
    mapping(uint256 => mapping(address => StakeInfo)) public stakes;

    /// @notice tokenId → follower → Subscription
    mapping(uint256 => mapping(address => Subscription)) public subscriptions;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Staked(uint256 indexed tokenId, address indexed staker, uint256 amount);
    event Unstaked(uint256 indexed tokenId, address indexed staker, uint256 amount);
    event RewardsClaimed(uint256 indexed tokenId, address indexed staker, uint256 amount);
    event Subscribed(uint256 indexed tokenId, address indexed follower, uint256 paidUntil);
    event FeesDistributed(uint256 indexed tokenId, uint256 agentShare, uint256 stakerShare);
    event FollowFeeUpdated(uint256 newFee);
    event PeriodDurationUpdated(uint256 newDuration);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error ZeroAmount();
    error InsufficientStake();
    error NotAdmin();
    error NoStakers();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _fateToken FATE token address
    /// @param _usdc USDC token address
    /// @param _sbt AgentSBT address
    /// @param _followFeeAmount Initial follow fee in USDC (6 decimals)
    /// @param _periodDuration Subscription period in seconds
    /// @param _admin Admin address
    constructor(
        address _fateToken,
        address _usdc,
        address _sbt,
        uint256 _followFeeAmount,
        uint256 _periodDuration,
        address _admin
    ) {
        fateToken = IERC20(_fateToken);
        usdc = IERC20(_usdc);
        sbt = IAgentSBTVault(_sbt);
        followFeeAmount = _followFeeAmount;
        periodDuration = _periodDuration;
        admin = _admin;
    }

    // -------------------------------------------------------------------------
    // Staking Functions
    // -------------------------------------------------------------------------

    /// @notice Stake FATE on an agent
    /// @param tokenId Agent SBT token ID
    /// @param amount Amount of FATE to stake
    function stake(uint256 tokenId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        VaultInfo storage vault = vaults[tokenId];
        StakeInfo storage stakeInfo = stakes[tokenId][msg.sender];

        // Harvest pending rewards before updating stake
        if (stakeInfo.amount > 0) {
            uint256 pending = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION - stakeInfo.rewardDebt;
            if (pending > 0) {
                usdc.safeTransfer(msg.sender, pending);
                emit RewardsClaimed(tokenId, msg.sender, pending);
            }
        }

        fateToken.safeTransferFrom(msg.sender, address(this), amount);
        stakeInfo.amount += amount;
        vault.totalStaked += amount;
        stakeInfo.rewardDebt = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION;

        emit Staked(tokenId, msg.sender, amount);
    }

    /// @notice Unstake FATE from an agent
    /// @param tokenId Agent SBT token ID
    /// @param amount Amount of FATE to unstake
    function unstake(uint256 tokenId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        StakeInfo storage stakeInfo = stakes[tokenId][msg.sender];
        if (stakeInfo.amount < amount) revert InsufficientStake();

        VaultInfo storage vault = vaults[tokenId];

        // Harvest pending rewards
        uint256 pending = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION - stakeInfo.rewardDebt;
        if (pending > 0) {
            usdc.safeTransfer(msg.sender, pending);
            emit RewardsClaimed(tokenId, msg.sender, pending);
        }

        stakeInfo.amount -= amount;
        vault.totalStaked -= amount;
        stakeInfo.rewardDebt = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION;

        fateToken.safeTransfer(msg.sender, amount);

        emit Unstaked(tokenId, msg.sender, amount);
    }

    /// @notice Claim accumulated USDC rewards from staking
    /// @param tokenId Agent SBT token ID
    function claimRewards(uint256 tokenId) external nonReentrant {
        VaultInfo storage vault = vaults[tokenId];
        StakeInfo storage stakeInfo = stakes[tokenId][msg.sender];

        uint256 pending = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION - stakeInfo.rewardDebt;
        if (pending == 0) revert ZeroAmount();

        stakeInfo.rewardDebt = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION;
        usdc.safeTransfer(msg.sender, pending);

        emit RewardsClaimed(tokenId, msg.sender, pending);
    }

    // -------------------------------------------------------------------------
    // Subscription Functions
    // -------------------------------------------------------------------------

    /// @notice Subscribe to follow an agent for one period
    /// @param tokenId Agent SBT token ID
    function subscribe(uint256 tokenId) external nonReentrant {
        uint256 fee = followFeeAmount;
        if (fee == 0) revert ZeroAmount();

        // Transfer USDC from follower
        usdc.safeTransferFrom(msg.sender, address(this), fee);

        // Calculate shares
        uint256 agentShare = (fee * AGENT_SHARE_BPS) / BPS_DENOMINATOR;
        uint256 stakerShare = fee - agentShare;

        // Pay agent
        address agentWallet = sbt.ownerOf(tokenId);
        usdc.safeTransfer(agentWallet, agentShare);

        // Distribute staker share
        VaultInfo storage vault = vaults[tokenId];
        if (vault.totalStaked > 0) {
            vault.accRewardPerShare += (stakerShare * ACC_PRECISION) / vault.totalStaked;
        }
        // If no stakers, stakerShare stays in contract (claimable later when stakers join)

        vault.totalFollowFeesCollected += fee;

        // Update subscription
        Subscription storage sub = subscriptions[tokenId][msg.sender];
        uint256 startTime = sub.paidUntil > block.timestamp ? sub.paidUntil : block.timestamp;
        sub.paidUntil = startTime + periodDuration;
        sub.active = true;

        emit FeesDistributed(tokenId, agentShare, stakerShare);
        emit Subscribed(tokenId, msg.sender, sub.paidUntil);
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /// @notice Get pending USDC rewards for a staker
    /// @param tokenId Agent SBT token ID
    /// @param staker Staker address
    /// @return pending Amount of pending USDC rewards
    function pendingRewards(uint256 tokenId, address staker) external view returns (uint256 pending) {
        VaultInfo storage vault = vaults[tokenId];
        StakeInfo storage stakeInfo = stakes[tokenId][staker];
        pending = (stakeInfo.amount * vault.accRewardPerShare) / ACC_PRECISION - stakeInfo.rewardDebt;
    }

    /// @notice Check if a subscription is active
    /// @param tokenId Agent SBT token ID
    /// @param follower Follower address
    /// @return Whether the subscription is currently active
    function isSubscriptionActive(uint256 tokenId, address follower) external view returns (bool) {
        Subscription storage sub = subscriptions[tokenId][follower];
        return sub.active && sub.paidUntil > block.timestamp;
    }

    // -------------------------------------------------------------------------
    // Admin Functions
    // -------------------------------------------------------------------------

    /// @notice Update follow fee amount
    function setFollowFee(uint256 newFee) external onlyAdmin {
        followFeeAmount = newFee;
        emit FollowFeeUpdated(newFee);
    }

    /// @notice Update subscription period duration
    function setPeriodDuration(uint256 newDuration) external onlyAdmin {
        periodDuration = newDuration;
        emit PeriodDurationUpdated(newDuration);
    }
}
