// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title FateToken
/// @notice $FATE — the governance and rewards token for Fate Market
/// @dev Capped supply at 100M tokens. Minting restricted to MINTER_ROLE.
///      Used for: betting incentive rewards, governance voting (Phase 3), staking (Phase 3).
///      NOT used for real betting — that uses USDC.
contract FateToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Maximum supply: 100 million tokens (18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error ExceedsMaxSupply(uint256 requested, uint256 available);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param admin The initial admin (receives DEFAULT_ADMIN_ROLE)
    /// @param initialMint Amount to mint to admin at deployment (can be 0)
    constructor(address admin, uint256 initialMint) ERC20("Fate Token", "FATE") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        if (initialMint > 0) {
            if (initialMint > MAX_SUPPLY) revert ExceedsMaxSupply(initialMint, MAX_SUPPLY);
            _mint(admin, initialMint);
        }
    }

    // -------------------------------------------------------------------------
    // External Functions
    // -------------------------------------------------------------------------

    /// @notice Mint new tokens (capped at MAX_SUPPLY)
    /// @param to Recipient address
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        uint256 available = MAX_SUPPLY - totalSupply();
        if (amount > available) revert ExceedsMaxSupply(amount, available);
        _mint(to, amount);
    }

    /// @notice Pause all token transfers
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause token transfers
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Internal Overrides
    // -------------------------------------------------------------------------

    /// @dev Required override for ERC20Pausable
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
