// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPredictionMarket} from "../interfaces/IPredictionMarket.sol";

/// @title PredictionMarket
/// @notice Binary parimutuel prediction market with USDC settlement on Base L2
/// @dev Deployed as EIP-1167 minimal clone by MarketFactory. Each instance holds its own USDC.
///      Lifecycle: Created → Open → Closed → Proposed → Final | Cancelled
///      Position storage: packed uint128|uint128 (YES|NO) per user in one slot.
///      Fee collected once at finalization, sent to Treasury.
contract PredictionMarket is IPredictionMarket, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint16 public constant MAX_FEE_BPS = 1000; // 10% max fee
    uint8 public constant MAX_OUTCOMES = 2;     // Binary only for v1

    // -------------------------------------------------------------------------
    // Storage (packed for gas efficiency)
    // -------------------------------------------------------------------------

    /// @notice Whether initialize() has been called
    bool private _initialized;

    /// @notice Current market state
    State public state;

    /// @notice Unique market identifier (from off-chain DB)
    bytes32 public marketId;

    /// @notice IPFS/DB metadata hash (question, rules, etc.)
    bytes32 public metadataHash;

    /// @notice Number of outcomes (2 for binary)
    uint8 public outcomeCount;

    /// @notice The winning outcome index (valid only in Final state)
    uint8 public finalOutcome;

    /// @notice Fee in basis points
    uint16 public feeBps;

    /// @notice Betting cutoff timestamp
    uint40 public closeTime;

    /// @notice Dispute window duration in seconds
    uint40 public disputeWindow;

    /// @notice Timestamp when dispute window ends (set when outcome proposed)
    uint40 public disputeDeadline;

    /// @notice Proposed outcome (valid only in Proposed state)
    uint8 private _proposedOutcome;

    /// @notice USDC token address
    address public usdc;

    /// @notice Oracle adapter address (can call oracleCallback)
    address public oracle;

    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Factory address (can call initialize, cancel)
    address public factory;

    /// @notice Total USDC in the pool
    uint256 public totalPool;

    /// @notice USDC per outcome pool: outcomePool[0] = YES, outcomePool[1] = NO
    mapping(uint8 => uint256) public outcomePool;

    /// @notice Packed positions: upper 128 bits = YES shares, lower 128 bits = NO shares
    mapping(address => uint256) private _positions;

    /// @notice Whether a user has claimed their payout/refund
    mapping(address => bool) public claimed;

    /// @notice Whether fees have been transferred to treasury
    bool public feesCollected;

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyState(State expected) {
        if (state != expected) {
            if (expected == State.Open) revert NotOpen();
            else if (expected == State.Closed) revert NotClosed();
            else if (expected == State.Proposed) revert NotProposed();
            else if (expected == State.Final) revert NotFinal();
            else if (expected == State.Cancelled) revert NotCancelled();
            else revert AlreadyInitialized();
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Initialize (called by Factory via clone)
    // -------------------------------------------------------------------------

    /// @inheritdoc IPredictionMarket
    function initialize(
        bytes32 _marketId,
        uint8 _outcomeCount,
        uint40 _closeTime,
        address _oracle,
        address _usdc,
        address _treasury,
        uint16 _feeBps,
        bytes32 _metadataHash,
        uint40 _disputeWindow
    ) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        factory = msg.sender;
        marketId = _marketId;
        outcomeCount = _outcomeCount;
        closeTime = _closeTime;
        oracle = _oracle;
        usdc = _usdc;
        treasury = _treasury;
        feeBps = _feeBps;
        metadataHash = _metadataHash;
        disputeWindow = _disputeWindow;

        // Market starts as Open immediately after creation
        state = State.Open;

        emit MarketInitialized(_marketId, _outcomeCount, _closeTime, _oracle, _feeBps);
    }

    // -------------------------------------------------------------------------
    // Betting
    // -------------------------------------------------------------------------

    /// @inheritdoc IPredictionMarket
    function placeBet(
        uint8 outcome,
        uint256 amount,
        address receiver,
        bytes32 offchainBetId
    ) external nonReentrant onlyState(State.Open) {
        if (block.timestamp >= closeTime) revert BettingTimePassed();
        if (outcome >= outcomeCount) revert InvalidOutcome();
        if (amount == 0) revert ZeroAmount();

        // Transfer USDC from caller to this market
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);

        // Update pools
        totalPool += amount;
        outcomePool[outcome] += amount;

        // Update position (packed: YES = upper 128, NO = lower 128)
        uint256 packed = _positions[receiver];
        if (outcome == 0) {
            // YES shares in upper 128 bits
            uint128 current = uint128(packed >> 128);
            current += uint128(amount);
            _positions[receiver] = (uint256(current) << 128) | uint128(packed);
        } else {
            // NO shares in lower 128 bits
            uint128 current = uint128(packed);
            current += uint128(amount);
            _positions[receiver] = (packed & (type(uint256).max << 128)) | uint256(current);
        }

        emit BetPlaced(marketId, msg.sender, receiver, outcome, amount, offchainBetId);
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /// @inheritdoc IPredictionMarket
    function close() external onlyState(State.Open) {
        if (block.timestamp < closeTime) revert CloseTimeNotReached();
        state = State.Closed;
        emit MarketClosed(marketId);
    }

    /// @inheritdoc IPredictionMarket
    function oracleCallback(
        uint8 outcome,
        bytes32 evidenceHash
    ) external onlyState(State.Closed) {
        if (msg.sender != oracle) revert OnlyOracle();
        if (outcome >= outcomeCount) revert InvalidOutcome();

        _proposedOutcome = outcome;
        uint40 deadline = uint40(block.timestamp) + disputeWindow;
        disputeDeadline = deadline;
        state = State.Proposed;

        emit OutcomeProposed(marketId, outcome, evidenceHash, deadline);
    }

    /// @inheritdoc IPredictionMarket
    function dispute(bytes32 reasonHash) external onlyState(State.Proposed) {
        if (block.timestamp >= disputeDeadline) revert DisputeWindowExpired();

        // Reset to Closed state — oracle must resubmit
        state = State.Closed;
        disputeDeadline = 0;

        emit OutcomeDisputed(marketId, msg.sender, reasonHash);
    }

    /// @inheritdoc IPredictionMarket
    function finalize() external onlyState(State.Proposed) {
        if (block.timestamp < disputeDeadline) revert DisputeWindowActive();

        finalOutcome = _proposedOutcome;
        state = State.Final;

        // Collect fees to treasury (once)
        _collectFees();

        emit OutcomeFinalized(marketId, finalOutcome);
    }

    /// @inheritdoc IPredictionMarket
    function cancel() external {
        if (msg.sender != factory) revert OnlyFactory();
        if (state == State.Final) revert NotCancelled(); // Can't cancel finalized
        state = State.Cancelled;
        emit MarketCancelled(marketId);
    }

    // -------------------------------------------------------------------------
    // Settlement
    // -------------------------------------------------------------------------

    /// @inheritdoc IPredictionMarket
    function claim(address receiver) external nonReentrant onlyState(State.Final) returns (uint256 payout) {
        if (claimed[msg.sender]) revert AlreadyClaimed();

        payout = _calculatePayout(msg.sender);
        if (payout == 0) revert NothingToClaim();

        claimed[msg.sender] = true;
        IERC20(usdc).safeTransfer(receiver, payout);

        emit PayoutClaimed(marketId, msg.sender, receiver, payout);
    }

    /// @inheritdoc IPredictionMarket
    function claimRefund(address receiver) external nonReentrant onlyState(State.Cancelled) returns (uint256 amount) {
        if (claimed[msg.sender]) revert AlreadyClaimed();

        amount = _totalShares(msg.sender);
        if (amount == 0) revert NothingToClaim();

        claimed[msg.sender] = true;
        IERC20(usdc).safeTransfer(receiver, amount);

        emit RefundClaimed(marketId, msg.sender, receiver, amount);
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /// @inheritdoc IPredictionMarket
    function getPosition(address user) external view returns (uint128 yesShares, uint128 noShares) {
        uint256 packed = _positions[user];
        yesShares = uint128(packed >> 128);
        noShares = uint128(packed);
    }

    /// @inheritdoc IPredictionMarket
    function claimable(address user) external view returns (uint256 payout) {
        if (state != State.Final || claimed[user]) return 0;
        return _calculatePayout(user);
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /// @dev Calculate payout for a user (parimutuel formula)
    ///      payout = (userStake / winnerPool) * (totalPool - fee)
    function _calculatePayout(address user) internal view returns (uint256) {
        uint256 packed = _positions[user];
        uint128 yesShares = uint128(packed >> 128);
        uint128 noShares = uint128(packed);

        uint256 userStake = finalOutcome == 0 ? uint256(yesShares) : uint256(noShares);
        if (userStake == 0) return 0;

        uint256 winnerPool = outcomePool[finalOutcome];
        if (winnerPool == 0) return 0;

        // Pool after fees
        uint256 fee = (totalPool * feeBps) / 10000;
        uint256 distributablePool = totalPool - fee;

        return (userStake * distributablePool) / winnerPool;
    }

    /// @dev Total shares (YES + NO) for refund calculation
    function _totalShares(address user) internal view returns (uint256) {
        uint256 packed = _positions[user];
        return uint256(uint128(packed >> 128)) + uint256(uint128(packed));
    }

    /// @dev Collect fees to treasury (called once at finalization)
    function _collectFees() internal {
        if (feesCollected) return;
        feesCollected = true;

        uint256 fee = (totalPool * feeBps) / 10000;
        if (fee > 0 && treasury != address(0)) {
            IERC20(usdc).safeTransfer(treasury, fee);
            emit FeesTransferred(marketId, treasury, fee);
        }
    }
}
