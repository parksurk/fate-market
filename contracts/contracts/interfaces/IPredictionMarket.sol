// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IPredictionMarket
/// @notice Interface for individual prediction market contracts (parimutuel model)
/// @dev Each market is deployed as a minimal clone via MarketFactory.
///      Lifecycle: Created -> Open -> Closed -> Proposed -> Final | Cancelled
///      Settlement: parimutuel — winners split the pool proportionally.
interface IPredictionMarket {
    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------

    enum State {
        Created,    // Initialized, not yet open
        Open,       // Accepting bets
        Closed,     // Betting closed, awaiting resolution
        Proposed,   // Outcome proposed, dispute window active
        Final,      // Outcome finalized, payouts available
        Cancelled   // Market cancelled, refunds available
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event MarketInitialized(
        bytes32 indexed marketId,
        uint8 outcomeCount,
        uint40 closeTime,
        address oracle,
        uint16 feeBps
    );

    event BetPlaced(
        bytes32 indexed marketId,
        address indexed payer,
        address indexed receiver,
        uint8 outcome,
        uint256 amount,
        bytes32 offchainBetId
    );

    event MarketClosed(bytes32 indexed marketId);

    event OutcomeProposed(
        bytes32 indexed marketId,
        uint8 outcome,
        bytes32 evidenceHash,
        uint40 disputeDeadline
    );

    event OutcomeDisputed(
        bytes32 indexed marketId,
        address indexed disputer,
        bytes32 reasonHash
    );

    event OutcomeFinalized(bytes32 indexed marketId, uint8 outcome);

    event PayoutClaimed(
        bytes32 indexed marketId,
        address indexed user,
        address indexed receiver,
        uint256 payout
    );

    event RefundClaimed(
        bytes32 indexed marketId,
        address indexed user,
        address indexed receiver,
        uint256 amount
    );

    event FeesTransferred(
        bytes32 indexed marketId,
        address indexed treasury,
        uint256 feeAmount
    );

    event MarketCancelled(bytes32 indexed marketId);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOpen();
    error NotClosed();
    error NotProposed();
    error NotFinal();
    error NotCancelled();
    error AlreadyInitialized();
    error InvalidOutcome();
    error ZeroAmount();
    error BettingTimePassed();
    error CloseTimeNotReached();
    error DisputeWindowActive();
    error DisputeWindowExpired();
    error NothingToClaim();
    error AlreadyClaimed();
    error OnlyFactory();
    error OnlyOracle();

    // -------------------------------------------------------------------------
    // Write Functions
    // -------------------------------------------------------------------------

    function initialize(
        bytes32 marketId,
        uint8 outcomeCount,
        uint40 closeTime,
        address oracle,
        address usdc,
        address treasury,
        uint16 feeBps,
        bytes32 metadataHash,
        uint40 disputeWindow
    ) external;

    function placeBet(uint8 outcome, uint256 amount, address receiver, bytes32 offchainBetId) external;
    function close() external;
    function oracleCallback(uint8 outcome, bytes32 evidenceHash) external;
    function dispute(bytes32 reasonHash) external;
    function finalize() external;
    function claim(address receiver) external returns (uint256 payout);
    function cancel() external;
    function claimRefund(address receiver) external returns (uint256 amount);

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    function marketId() external view returns (bytes32);
    function state() external view returns (State);
    function closeTime() external view returns (uint40);
    function feeBps() external view returns (uint16);
    function totalPool() external view returns (uint256);
    function outcomePool(uint8 outcomeIndex) external view returns (uint256);
    function getPosition(address user) external view returns (uint128 yesShares, uint128 noShares);
    function claimable(address user) external view returns (uint256 payout);
    function finalOutcome() external view returns (uint8);
}
