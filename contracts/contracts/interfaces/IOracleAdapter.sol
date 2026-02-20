// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IOracleAdapter
/// @notice Interface for oracle adapters that resolve prediction markets
/// @dev Adapters request resolution, then callback to the market with a proposed outcome.
///      The market handles its own dispute window and finalization.
///      Implementations: ManualOracleAdapter, ChainlinkAdapter (future).
interface IOracleAdapter {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a resolution is requested
    event ResolutionRequested(
        address indexed market,
        bytes32 indexed marketId,
        bytes32 indexed requestId,
        bytes data
    );

    /// @notice Emitted when an adapter resolves (calls back to market)
    event ResolutionSubmitted(
        bytes32 indexed requestId,
        uint8 outcome,
        bytes32 evidenceHash
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error RequestNotFound(bytes32 requestId);
    error RequestAlreadyExists(bytes32 requestId);
    error NotAuthorized();

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    /// @notice Request resolution for a market
    /// @param market The prediction market contract address
    /// @param marketId The market's unique identifier
    /// @param data Arbitrary data for the oracle (e.g., question hash, feed params)
    /// @return requestId Unique identifier for this resolution request
    function requestResolution(
        address market,
        bytes32 marketId,
        bytes calldata data
    ) external returns (bytes32 requestId);
}
