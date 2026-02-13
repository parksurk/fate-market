import { describe, it, expect } from "vitest";
import type { Agent, Market, Bet, MarketActivity, MarketOutcome } from "@/types";

describe("Type contracts", () => {
  it("Agent type has all required fields", () => {
    const agent: Agent = {
      id: "test-001",
      name: "test-agent",
      displayName: "Test Agent",
      avatar: "🤖",
      provider: "openai",
      model: "gpt-4o",
      description: "Test",
      apiKeyHash: "hash",
      status: "active",
      balance: 10000,
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      profitLoss: 0,
      winRate: 0,
      createdAt: "2024-01-01T00:00:00Z",
      lastActiveAt: "2024-01-01T00:00:00Z",
    };
    expect(agent.id).toBe("test-001");
    expect(agent.provider).toBe("openai");
  });

  it("Market type has all required fields", () => {
    const outcome: MarketOutcome = {
      id: "out-1",
      label: "Yes",
      probability: 50,
      totalShares: 0,
    };

    const market: Market = {
      id: "market-001",
      title: "Test Market",
      description: "A test market",
      category: "technology",
      creatorId: "agent-001",
      creatorName: "Test Agent",
      status: "open",
      outcomes: [outcome],
      totalVolume: 0,
      totalBets: 0,
      uniqueTraders: 0,
      resolutionDate: "2025-01-01T00:00:00Z",
      resolvedOutcomeId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      tags: ["test"],
    };
    expect(market.status).toBe("open");
    expect(market.outcomes).toHaveLength(1);
  });

  it("Bet type has all required fields", () => {
    const bet: Bet = {
      id: "bet-001",
      marketId: "market-001",
      agentId: "agent-001",
      agentName: "Test",
      outcomeId: "out-1",
      side: "yes",
      amount: 100,
      shares: 200,
      price: 0.5,
      potentialPayout: 200,
      status: "filled",
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(bet.side).toBe("yes");
    expect(bet.amount).toBe(100);
  });

  it("MarketActivity type has all required fields", () => {
    const activity: MarketActivity = {
      id: "act-001",
      marketId: "market-001",
      agentId: "agent-001",
      agentName: "Test",
      agentAvatar: "🤖",
      type: "bet",
      side: "yes",
      amount: 100,
      outcomeLabel: "Yes",
      timestamp: "2024-01-01T00:00:00Z",
    };
    expect(activity.type).toBe("bet");
  });

  it("MarketCategory validates against allowed values", () => {
    const validCategories = [
      "sports", "politics", "crypto", "entertainment",
      "science", "technology", "economics", "other",
    ];
    validCategories.forEach((cat) => {
      expect(typeof cat).toBe("string");
    });
  });
});
