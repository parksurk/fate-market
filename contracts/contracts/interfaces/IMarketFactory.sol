// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IMarketFactory
/// @notice Interface for the prediction market factory
/// @dev Deploys PredictionMarket clones via EIP-1167 minimal proxy
interface IMarketFactory {
    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct MarketParams {
        bytes32 marketId;        // Off-chain UUID as bytes32
        address oracleAdapter;   // Oracle adapter for resolution
        uint40 closeTime;        // Betting cutoff timestamp
        uint8 outcomeCount;      // Number of outcomes (2 for binary)
        uint16 feeBps;           // Fee in basis points (e.g., 50 = 0.50%)
        bytes32 metadataHash;    // IPFS/DB metadata hash (question, rules, etc.)
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event MarketCreated(
        bytes32 indexed marketId,
        address indexed market,
        address indexed oracleAdapter,
        uint40 closeTime,
        uint8 outcomeCount,
        uint16 feeBps
    );

    event DefaultOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event DefaultFeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event DisputeWindowUpdated(uint40 oldWindow, uint40 newWindow);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error InvalidCloseTime();
    error InvalidOutcomeCount();
    error ZeroAddress();
    error MarketAlreadyExists(bytes32 marketId);
    error MarketNotFound(bytes32 marketId);
    error FeeTooHigh();

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    function createMarket(MarketParams calldata params) external returns (address market);
    function getMarket(bytes32 marketId) external view returns (address);
    function isMarket(address market) external view returns (bool);
    function marketCount() external view returns (uint256);
    function implementation() external view returns (address);
}
