// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {IPredictionMarket} from "../interfaces/IPredictionMarket.sol";

/// @title ManualOracleAdapter
/// @notice Manual resolution oracle for prediction markets
/// @dev Authorized resolvers propose outcomes by calling resolve(), which triggers
///      the market's oracleCallback. The market itself handles the dispute window.
///      Suitable for admin/multisig resolution in early stages.
contract ManualOracleAdapter is IOracleAdapter, AccessControl {
    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Tracks resolution requests: requestId → market address
    mapping(bytes32 => address) public requestMarket;

    /// @notice Tracks whether a request has been resolved
    mapping(bytes32 => bool) public requestResolved;

    /// @notice Nonce for generating unique request IDs
    uint256 private _nonce;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param admin The initial admin (DEFAULT_ADMIN_ROLE + RESOLVER_ROLE)
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RESOLVER_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // IOracleAdapter Implementation
    // -------------------------------------------------------------------------

    /// @inheritdoc IOracleAdapter
    function requestResolution(
        address market,
        bytes32 _marketId,
        bytes calldata data
    ) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(market, _marketId, _nonce++));
        if (requestMarket[requestId] != address(0)) revert RequestAlreadyExists(requestId);

        requestMarket[requestId] = market;

        emit ResolutionRequested(market, _marketId, requestId, data);
    }

    // -------------------------------------------------------------------------
    // Manual Resolution
    // -------------------------------------------------------------------------

    /// @notice Manually resolve a market (resolver submits outcome)
    /// @param requestId The resolution request ID
    /// @param outcome The winning outcome index
    /// @param evidenceHash Hash of resolution evidence (IPFS CID hash, etc.)
    function resolve(
        bytes32 requestId,
        uint8 outcome,
        bytes32 evidenceHash
    ) external onlyRole(RESOLVER_ROLE) {
        address market = requestMarket[requestId];
        if (market == address(0)) revert RequestNotFound(requestId);
        if (requestResolved[requestId]) revert RequestAlreadyExists(requestId);

        requestResolved[requestId] = true;

        // Callback to the market with the proposed outcome
        IPredictionMarket(market).oracleCallback(outcome, evidenceHash);

        emit ResolutionSubmitted(requestId, outcome, evidenceHash);
    }
}
