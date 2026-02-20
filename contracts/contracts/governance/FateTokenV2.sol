// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title FateTokenV2
/// @notice Voting-enabled wrapper around FateToken (V1).
///         Users deposit FATE V1 → receive V2 1:1. V2 has ERC20Votes for governance.
/// @dev Does NOT modify FateToken V1. Wraps it like WETH wraps ETH.
contract FateTokenV2 is ERC20, ERC20Permit, ERC20Votes, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The underlying FateToken (V1)
    IERC20 public immutable fateV1;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error ZeroAmount();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _fateV1 Address of the existing FateToken contract
    constructor(address _fateV1)
        ERC20("Staked Fate Token", "sFATE")
        ERC20Permit("Staked Fate Token")
    {
        fateV1 = IERC20(_fateV1);
    }

    // -------------------------------------------------------------------------
    // External Functions
    // -------------------------------------------------------------------------

    /// @notice Deposit FATE V1 and receive sFATE (V2) 1:1
    /// @param amount Amount of FATE V1 to deposit
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        fateV1.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Burn sFATE (V2) and withdraw FATE V1 1:1
    /// @param amount Amount of sFATE to withdraw
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _burn(msg.sender, amount);
        fateV1.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Internal Overrides
    // -------------------------------------------------------------------------

    /// @dev Required override: ERC20 + ERC20Votes
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    /// @dev Required override: ERC20Permit + ERC20Votes both use Nonces
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
