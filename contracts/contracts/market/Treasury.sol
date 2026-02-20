// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Treasury
/// @notice Fee collection and treasury management for Fate Market
/// @dev Receives fees from finalized prediction markets. Admin can withdraw to EOA/multisig.
contract Treasury is AccessControl {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();
    error EthTransferFailed();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param admin The initial admin and withdrawer
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(WITHDRAWER_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // Receive
    // -------------------------------------------------------------------------

    /// @notice Accept ETH deposits
    receive() external payable {}

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    /// @notice Withdraw ERC-20 tokens from the treasury
    /// @param token The ERC-20 token address
    /// @param to Recipient address
    /// @param amount Amount to withdraw
    function withdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(WITHDRAWER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    /// @notice Withdraw ETH from the treasury
    /// @param to Recipient address
    /// @param amount Amount to withdraw
    function withdrawEth(
        address payable to,
        uint256 amount
    ) external onlyRole(WITHDRAWER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert EthTransferFailed();
        emit EthWithdrawn(to, amount);
    }

    /// @notice Get the balance of a specific ERC-20 token in this treasury
    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
