// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBetRegistry} from "./interfaces/IBetRegistry.sol";

/// @title BetRegistry
/// @notice Minimal on-chain bet receipt anchor contract for Fate Market (Phase 1)
/// @dev Records an immutable anchor for each bet: betId → bool, plus a full event log.
///      Gas-optimized: only a bool mapping + event emission per bet.
///      Only the owner (server wallet) can submit records in Phase 1.
contract BetRegistry is Ownable, IBetRegistry {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Tracks which betIds have been recorded to prevent duplicates
    mapping(bytes32 => bool) public recorded;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param initialOwner The address that will own the contract (server wallet)
    constructor(address initialOwner) Ownable(initialOwner) {}

    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /// @inheritdoc IBetRegistry
    /// @dev Gas breakdown (approximate):
    ///      - SLOAD (recorded[betId]) : ~2100 gas (cold)
    ///      - SSTORE (true)           : ~20000 gas (cold write)
    ///      - LOG4 event              : ~1500 + data gas
    ///      Total per call            : ~25–30k gas on Base L2 (very cheap)
    function recordBet(
        bytes32 betId,
        bytes32 contentHash,
        string calldata cid
    ) external onlyOwner {
        if (betId == bytes32(0)) revert InvalidBetId();
        if (contentHash == bytes32(0)) revert InvalidContentHash();
        if (recorded[betId]) revert BetAlreadyRecorded(betId);

        recorded[betId] = true;

        emit BetRecorded(betId, contentHash, cid, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /// @inheritdoc IBetRegistry
    function isRecorded(bytes32 betId) external view returns (bool) {
        return recorded[betId];
    }
}
