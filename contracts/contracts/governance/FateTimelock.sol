// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title FateTimelock
/// @notice Timelock controller for Fate Market DAO governance.
///         All governor-approved proposals must wait through the timelock delay.
/// @dev Thin wrapper around OZ TimelockController. Proposer = FateGovernor.
///      Executor = address(0) means anyone can execute after delay.
contract FateTimelock is TimelockController {
    /// @param minDelay Minimum delay in seconds (e.g., 2 days = 172800)
    /// @param proposers Addresses allowed to propose (typically [FateGovernor])
    /// @param executors Addresses allowed to execute (address(0) = anyone)
    /// @param admin Initial admin for setup (should renounce after config)
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
