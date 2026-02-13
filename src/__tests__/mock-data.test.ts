import { describe, it, expect } from "vitest";
import {
  MOCK_AGENTS,
  MOCK_MARKETS,
  MOCK_BETS,
  MOCK_ACTIVITIES,
  getAgentById,
  getMarketById,
  getBetsByMarket,
  getBetsByAgent,
  getActivitiesByMarket,
} from "@/lib/mock-data";

describe("MOCK_AGENTS", () => {
  it("has 8 agents", () => {
    expect(MOCK_AGENTS).toHaveLength(8);
  });

  it("all agents have required fields", () => {
    MOCK_AGENTS.forEach((agent) => {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.displayName).toBeTruthy();
      expect(agent.provider).toBeTruthy();
      expect(agent.model).toBeTruthy();
      expect(typeof agent.balance).toBe("number");
      expect(typeof agent.winRate).toBe("number");
    });
  });

  it("all agent IDs are unique", () => {
    const ids = MOCK_AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("MOCK_MARKETS", () => {
  it("has 10 markets", () => {
    expect(MOCK_MARKETS).toHaveLength(10);
  });

  it("each market has at least 2 outcomes", () => {
    MOCK_MARKETS.forEach((market) => {
      expect(market.outcomes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("outcome probabilities are between 0 and 100", () => {
    MOCK_MARKETS.forEach((market) => {
      market.outcomes.forEach((o) => {
        expect(o.probability).toBeGreaterThanOrEqual(0);
        expect(o.probability).toBeLessThanOrEqual(100);
      });
    });
  });

  it("has at least one market of each status type", () => {
    const statuses = new Set(MOCK_MARKETS.map((m) => m.status));
    expect(statuses.has("open")).toBe(true);
    expect(statuses.has("resolved")).toBe(true);
  });
});

describe("getAgentById", () => {
  it("returns agent for valid ID", () => {
    const agent = getAgentById("agent-001");
    expect(agent).toBeDefined();
    expect(agent?.name).toBe("oracle-gpt");
  });

  it("returns undefined for invalid ID", () => {
    expect(getAgentById("agent-999")).toBeUndefined();
  });
});

describe("getMarketById", () => {
  it("returns market for valid ID", () => {
    const market = getMarketById("market-001");
    expect(market).toBeDefined();
    expect(market?.title).toContain("GPT-5");
  });

  it("returns undefined for invalid ID", () => {
    expect(getMarketById("market-999")).toBeUndefined();
  });
});

describe("getBetsByMarket", () => {
  it("returns bets for a market with bets", () => {
    const bets = getBetsByMarket("market-001");
    expect(bets.length).toBeGreaterThan(0);
    bets.forEach((b) => expect(b.marketId).toBe("market-001"));
  });

  it("returns empty array for market with no bets", () => {
    const bets = getBetsByMarket("market-999");
    expect(bets).toEqual([]);
  });
});

describe("getBetsByAgent", () => {
  it("returns bets for an agent", () => {
    const bets = getBetsByAgent("agent-002");
    expect(bets.length).toBeGreaterThan(0);
    bets.forEach((b) => expect(b.agentId).toBe("agent-002"));
  });
});

describe("getActivitiesByMarket", () => {
  it("returns activities for a market", () => {
    const activities = getActivitiesByMarket("market-001");
    expect(activities.length).toBeGreaterThan(0);
    activities.forEach((a) => expect(a.marketId).toBe("market-001"));
  });
});

describe("MOCK_BETS", () => {
  it("all bets reference valid markets", () => {
    MOCK_BETS.forEach((bet) => {
      expect(getMarketById(bet.marketId)).toBeDefined();
    });
  });

  it("all bets reference valid agents", () => {
    MOCK_BETS.forEach((bet) => {
      expect(getAgentById(bet.agentId)).toBeDefined();
    });
  });

  it("all bet amounts are positive", () => {
    MOCK_BETS.forEach((bet) => {
      expect(bet.amount).toBeGreaterThan(0);
    });
  });
});

describe("MOCK_ACTIVITIES", () => {
  it("has valid activity types", () => {
    const validTypes = ["bet", "create", "resolve"];
    MOCK_ACTIVITIES.forEach((a) => {
      expect(validTypes).toContain(a.type);
    });
  });

  it("bet activities have side and amount", () => {
    MOCK_ACTIVITIES.filter((a) => a.type === "bet").forEach((a) => {
      expect(a.side).toBeDefined();
      expect(a.amount).toBeDefined();
      expect(a.amount).toBeGreaterThan(0);
    });
  });
});
