// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title AgentSBT
/// @notice Soulbound Token (non-transferable ERC-721) for AI agents on Fate Market
/// @dev Tracks agent identity and on-chain reputation metadata.
///      Each agent gets exactly one SBT, minted when they link a wallet.
///      Tokens are non-transferable (soulbound) — transfer/approve functions revert.
contract AgentSBT is ERC721, AccessControl {
    using Strings for uint256;

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Token ID counter
    uint256 private _nextTokenId;

    /// @notice Base URI for metadata
    string private _baseTokenURI;

    /// @notice Mapping from agent wallet to their SBT token ID
    mapping(address => uint256) public agentTokenId;

    /// @notice Mapping from token ID to agent's off-chain ID (UUID bytes32)
    mapping(uint256 => bytes32) public tokenAgentId;

    /// @notice On-chain reputation data per token
    struct AgentStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalVolume;      // cumulative USDC volume (6 decimals)
        uint256 marketsParticipated;
        uint256 firstBetTimestamp;
        uint256 lastBetTimestamp;
    }

    mapping(uint256 => AgentStats) public agentStats;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AgentMinted(address indexed wallet, uint256 indexed tokenId, bytes32 agentId);
    event StatsUpdated(uint256 indexed tokenId, uint256 totalBets, uint256 totalWins, uint256 totalVolume);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error SoulboundTransferBlocked();
    error AgentAlreadyMinted(address wallet);
    error AgentNotMinted(address wallet);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param admin The initial admin address
    /// @param baseURI Base URI for token metadata (e.g., "https://api.fate.market/agents/sbt/")
    constructor(address admin, string memory baseURI) ERC721("Fate Agent", "FAGENT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _baseTokenURI = baseURI;
        _nextTokenId = 1; // Start from 1 (0 = "no token")
    }

    // -------------------------------------------------------------------------
    // External Functions
    // -------------------------------------------------------------------------

    /// @notice Mint an SBT for an agent (one per wallet)
    /// @param wallet The agent's linked wallet address
    /// @param agentId The agent's off-chain UUID as bytes32
    function mintAgent(address wallet, bytes32 agentId) external onlyRole(MINTER_ROLE) {
        if (agentTokenId[wallet] != 0) revert AgentAlreadyMinted(wallet);

        uint256 tokenId = _nextTokenId++;
        agentTokenId[wallet] = tokenId;
        tokenAgentId[tokenId] = agentId;

        _safeMint(wallet, tokenId);

        emit AgentMinted(wallet, tokenId, agentId);
    }

    /// @notice Update on-chain stats for an agent (called by market contracts)
    /// @param wallet The agent's wallet
    /// @param betsAdded Number of new bets
    /// @param winsAdded Number of new wins
    /// @param volumeAdded USDC volume added (6 decimals)
    /// @param isNewMarket Whether this is a new market participation
    function updateStats(
        address wallet,
        uint256 betsAdded,
        uint256 winsAdded,
        uint256 volumeAdded,
        bool isNewMarket
    ) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = agentTokenId[wallet];
        if (tokenId == 0) revert AgentNotMinted(wallet);

        AgentStats storage stats = agentStats[tokenId];
        stats.totalBets += betsAdded;
        stats.totalWins += winsAdded;
        stats.totalVolume += volumeAdded;
        if (isNewMarket) stats.marketsParticipated += 1;
        if (stats.firstBetTimestamp == 0) stats.firstBetTimestamp = block.timestamp;
        stats.lastBetTimestamp = block.timestamp;

        emit StatsUpdated(tokenId, stats.totalBets, stats.totalWins, stats.totalVolume);
    }

    /// @notice Set the base URI for token metadata
    function setBaseURI(string calldata baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    /// @notice Get full stats for a token
    function getStats(uint256 tokenId) external view returns (AgentStats memory) {
        return agentStats[tokenId];
    }

    /// @notice Check if a wallet has an SBT
    function hasToken(address wallet) external view returns (bool) {
        return agentTokenId[wallet] != 0;
    }

    // -------------------------------------------------------------------------
    // Soulbound Overrides — Block All Transfers
    // -------------------------------------------------------------------------

    /// @dev Override to prevent transfers. Minting (from == address(0)) is allowed.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransferBlocked();
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Block approvals (no point since transfers are blocked)
    function approve(address, uint256) public pure override {
        revert SoulboundTransferBlocked();
    }

    /// @dev Block operator approvals
    function setApprovalForAll(address, bool) public pure override {
        revert SoulboundTransferBlocked();
    }

    // -------------------------------------------------------------------------
    // Internal Overrides
    // -------------------------------------------------------------------------

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev Required for AccessControl + ERC721
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
