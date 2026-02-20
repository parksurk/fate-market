// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ReputationScorer
/// @notice Computes on-chain reputation scores from AgentSBT stats.
/// @dev Score range: 0–10000 (basis points of 100%).
///      Formula: winRate(40%) + volume(20%) + consistency(20%) + activity(20%)
interface IAgentSBT {
    struct AgentStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalVolume;
        uint256 marketsParticipated;
        uint256 firstBetTimestamp;
        uint256 lastBetTimestamp;
    }

    function getStats(uint256 tokenId) external view returns (AgentStats memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ReputationScorer is AccessControl {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The AgentSBT contract
    IAgentSBT public immutable sbt;

    /// @notice Cached reputation score per token
    mapping(uint256 => uint256) public reputationScore;

    /// @notice Last update timestamp per token
    mapping(uint256 => uint256) public lastScoreUpdate;

    /// @notice Volume cap for max volume component (USDC, 6 decimals)
    uint256 public constant VOLUME_CAP = 1_000e6; // 1000 USDC

    /// @notice Max markets for consistency cap
    uint256 public constant CONSISTENCY_CAP = 50;

    /// @notice Activity decay window (30 days)
    uint256 public constant ACTIVITY_WINDOW = 30 days;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event ScoreUpdated(uint256 indexed tokenId, uint256 oldScore, uint256 newScore);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _sbt Address of the AgentSBT contract
    /// @param admin Admin address
    constructor(address _sbt, address admin) {
        sbt = IAgentSBT(_sbt);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // External Functions
    // -------------------------------------------------------------------------

    /// @notice Update cached score for a token (anyone can call)
    /// @param tokenId The agent SBT token ID
    function updateScore(uint256 tokenId) external {
        uint256 oldScore = reputationScore[tokenId];
        uint256 newScore = computeScore(tokenId);
        reputationScore[tokenId] = newScore;
        lastScoreUpdate[tokenId] = block.timestamp;
        emit ScoreUpdated(tokenId, oldScore, newScore);
    }

    /// @notice Batch update scores
    /// @param tokenIds Array of token IDs
    function batchUpdateScores(uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 oldScore = reputationScore[tokenIds[i]];
            uint256 newScore = computeScore(tokenIds[i]);
            reputationScore[tokenIds[i]] = newScore;
            lastScoreUpdate[tokenIds[i]] = block.timestamp;
            emit ScoreUpdated(tokenIds[i], oldScore, newScore);
        }
    }

    /// @notice Get cached score (returns 0 if never updated)
    function getScore(uint256 tokenId) external view returns (uint256) {
        return reputationScore[tokenId];
    }

    /// @notice Compute live score from current SBT stats (no state change)
    /// @param tokenId The agent SBT token ID
    /// @return score 0–10000
    function computeScore(uint256 tokenId) public view returns (uint256 score) {
        IAgentSBT.AgentStats memory stats = sbt.getStats(tokenId);

        // No bets = zero score
        if (stats.totalBets == 0) return 0;

        // Win rate component: (wins / bets) * 4000 [40% weight, max 4000]
        uint256 winRateComponent = (stats.totalWins * 4000) / stats.totalBets;

        // Volume component: min(volume / VOLUME_CAP, 1) * 2000 [20% weight, max 2000]
        uint256 volumeComponent;
        if (stats.totalVolume >= VOLUME_CAP) {
            volumeComponent = 2000;
        } else {
            volumeComponent = (stats.totalVolume * 2000) / VOLUME_CAP;
        }

        // Consistency component: min(marketsParticipated / CONSISTENCY_CAP, 1) * 2000 [20% weight, max 2000]
        uint256 consistencyComponent;
        if (stats.marketsParticipated >= CONSISTENCY_CAP) {
            consistencyComponent = 2000;
        } else {
            consistencyComponent = (stats.marketsParticipated * 2000) / CONSISTENCY_CAP;
        }

        // Activity component: [20% weight, max 2000]
        // Full 2000 if active within ACTIVITY_WINDOW, decays linearly over next ACTIVITY_WINDOW
        uint256 activityComponent;
        if (stats.lastBetTimestamp == 0) {
            activityComponent = 0;
        } else {
            uint256 elapsed = block.timestamp - stats.lastBetTimestamp;
            if (elapsed <= ACTIVITY_WINDOW) {
                activityComponent = 2000;
            } else if (elapsed <= 2 * ACTIVITY_WINDOW) {
                // Linear decay from 2000 to 0 over the second window
                activityComponent = 2000 - ((elapsed - ACTIVITY_WINDOW) * 2000) / ACTIVITY_WINDOW;
            } else {
                activityComponent = 0;
            }
        }

        score = winRateComponent + volumeComponent + consistencyComponent + activityComponent;

        // Cap at 10000 (shouldn't exceed, but safety check)
        if (score > 10000) score = 10000;
    }
}
