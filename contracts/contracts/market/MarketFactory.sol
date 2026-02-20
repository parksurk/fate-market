// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IMarketFactory} from "../interfaces/IMarketFactory.sol";
import {IPredictionMarket} from "../interfaces/IPredictionMarket.sol";

/// @title MarketFactory
/// @notice Factory for deploying PredictionMarket clones via EIP-1167
/// @dev Uses minimal proxy pattern for gas-efficient market deployment on Base L2.
///      Each clone is initialized with market-specific parameters.
contract MarketFactory is IMarketFactory, AccessControl, Pausable {
    using Clones for address;

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    bytes32 public constant MARKET_CREATOR_ROLE = keccak256("MARKET_CREATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint16 public constant MAX_FEE_BPS = 1000; // 10% max
    uint8 public constant MIN_OUTCOMES = 2;
    uint8 public constant MAX_OUTCOMES = 2;     // Binary only for v1

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice PredictionMarket implementation contract (clone source)
    address public implementation;

    /// @notice USDC token address
    address public usdc;

    /// @notice Default oracle adapter
    address public defaultOracle;

    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Default fee in basis points
    uint16 public defaultFeeBps;

    /// @notice Default dispute window duration in seconds
    uint40 public disputeWindow;

    /// @notice Market registry: marketId → clone address
    mapping(bytes32 => address) private _markets;

    /// @notice Reverse lookup: clone address → is a market from this factory
    mapping(address => bool) private _isMarket;

    /// @notice Array of all market IDs for enumeration
    bytes32[] private _marketIds;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _implementation PredictionMarket implementation address
    /// @param _usdc USDC token address
    /// @param _defaultOracle Default oracle adapter address
    /// @param _treasury Treasury address
    /// @param _defaultFeeBps Default fee (basis points)
    /// @param _disputeWindow Default dispute window (seconds)
    /// @param admin Admin address
    constructor(
        address _implementation,
        address _usdc,
        address _defaultOracle,
        address _treasury,
        uint16 _defaultFeeBps,
        uint40 _disputeWindow,
        address admin
    ) {
        if (_implementation == address(0)) revert ZeroAddress();
        if (_usdc == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        if (_defaultFeeBps > MAX_FEE_BPS) revert FeeTooHigh();

        implementation = _implementation;
        usdc = _usdc;
        defaultOracle = _defaultOracle;
        treasury = _treasury;
        defaultFeeBps = _defaultFeeBps;
        disputeWindow = _disputeWindow;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARKET_CREATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // Market Creation
    // -------------------------------------------------------------------------

    /// @inheritdoc IMarketFactory
    function createMarket(
        MarketParams calldata params
    ) external onlyRole(MARKET_CREATOR_ROLE) whenNotPaused returns (address market) {
        // Validation
        if (_markets[params.marketId] != address(0)) revert MarketAlreadyExists(params.marketId);
        if (params.closeTime <= uint40(block.timestamp)) revert InvalidCloseTime();
        if (params.outcomeCount < MIN_OUTCOMES || params.outcomeCount > MAX_OUTCOMES) revert InvalidOutcomeCount();
        if (params.feeBps > MAX_FEE_BPS) revert FeeTooHigh();

        // Use provided oracle or default
        address oracleAdapter = params.oracleAdapter != address(0) ? params.oracleAdapter : defaultOracle;
        if (oracleAdapter == address(0)) revert ZeroAddress();

        // Deploy clone
        market = implementation.clone();

        // Initialize the clone
        IPredictionMarket(market).initialize(
            params.marketId,
            params.outcomeCount,
            params.closeTime,
            oracleAdapter,
            usdc,
            treasury,
            params.feeBps,
            params.metadataHash,
            disputeWindow
        );

        // Register
        _markets[params.marketId] = market;
        _isMarket[market] = true;
        _marketIds.push(params.marketId);

        emit MarketCreated(
            params.marketId,
            market,
            oracleAdapter,
            params.closeTime,
            params.outcomeCount,
            params.feeBps
        );
    }

    // -------------------------------------------------------------------------
    // Admin Functions
    // -------------------------------------------------------------------------

    /// @notice Cancel a market (admin only)
    function cancelMarket(bytes32 _marketId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address market = _markets[_marketId];
        if (market == address(0)) revert MarketNotFound(_marketId);
        IPredictionMarket(market).cancel();
    }

    /// @notice Update the default oracle adapter
    function setDefaultOracle(address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit DefaultOracleUpdated(defaultOracle, newOracle);
        defaultOracle = newOracle;
    }

    /// @notice Update the treasury address
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @notice Update the default fee
    function setDefaultFee(uint16 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit DefaultFeeUpdated(defaultFeeBps, newFeeBps);
        defaultFeeBps = newFeeBps;
    }

    /// @notice Update the dispute window
    function setDisputeWindow(uint40 newWindow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit DisputeWindowUpdated(disputeWindow, newWindow);
        disputeWindow = newWindow;
    }

    /// @notice Pause market creation
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause market creation
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /// @inheritdoc IMarketFactory
    function getMarket(bytes32 _marketId) external view returns (address) {
        return _markets[_marketId];
    }

    /// @inheritdoc IMarketFactory
    function isMarket(address market) external view returns (bool) {
        return _isMarket[market];
    }

    /// @inheritdoc IMarketFactory
    function marketCount() external view returns (uint256) {
        return _marketIds.length;
    }
}
