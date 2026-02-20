// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IBetRegistry
/// @notice Interface for the BetRegistry on-chain bet receipt anchor contract
/// @dev Phase 1 — minimal anchoring: events + bool mapping only (gas-optimized)
interface IBetRegistry {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a bet is recorded on-chain
    /// @param betId        Unique bet identifier derived from the DB UUID
    /// @param contentHash  keccak256 of the canonical JSON bet receipt
    /// @param cid          IPFS CID of the pinned receipt
    /// @param submitter    Address that submitted the record (owner/server)
    /// @param timestamp    Block timestamp at time of recording
    event BetRecorded(
        bytes32 indexed betId,
        bytes32 contentHash,
        string cid,
        address indexed submitter,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @notice Thrown when attempting to record a betId that already exists
    error BetAlreadyRecorded(bytes32 betId);

    /// @notice Thrown when a zero betId is provided
    error InvalidBetId();

    /// @notice Thrown when a zero contentHash is provided
    error InvalidContentHash();

    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /// @notice Record a bet receipt anchor on-chain
    /// @dev Only callable by owner (server wallet in Phase 1).
    ///      Reverts if betId has already been recorded.
    /// @param betId        Unique bet identifier (keccak256 of DB UUID bytes)
    /// @param contentHash  keccak256 of the canonical JSON bet receipt
    /// @param cid          IPFS CID of the pinned receipt
    function recordBet(bytes32 betId, bytes32 contentHash, string calldata cid) external;

    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /// @notice Check whether a bet has been recorded
    /// @param betId  The bet identifier to query
    /// @return True if the betId has been recorded, false otherwise
    function isRecorded(bytes32 betId) external view returns (bool);
}
