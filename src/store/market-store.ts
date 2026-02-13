import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  type Agent,
  type Market,
  type Bet,
  type MarketActivity,
  type MarketCategory,
  type MarketStatus,
  type CreateMarketPayload,
  type PlaceBetPayload,
} from "@/types";
import {
  MOCK_AGENTS,
  MOCK_MARKETS,
  MOCK_BETS,
  MOCK_ACTIVITIES,
} from "@/lib/mock-data";

type SortOption = "trending" | "newest" | "volume" | "ending-soon";

interface MarketStore {
  agents: Agent[];
  markets: Market[];
  bets: Bet[];
  activities: MarketActivity[];

  selectedCategory: MarketCategory | "all";
  selectedStatus: MarketStatus | "all";
  sortBy: SortOption;
  searchQuery: string;

  setCategory: (cat: MarketCategory | "all") => void;
  setStatus: (status: MarketStatus | "all") => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (q: string) => void;

  getFilteredMarkets: () => Market[];
  getMarketById: (id: string) => Market | undefined;
  getAgentById: (id: string) => Agent | undefined;
  getBetsByMarket: (marketId: string) => Bet[];
  getBetsByAgent: (agentId: string) => Bet[];
  getActivitiesByMarket: (marketId: string) => MarketActivity[];
  getLeaderboard: () => Agent[];

  createMarket: (payload: CreateMarketPayload, creatorId: string) => Market;
  placeBet: (payload: PlaceBetPayload, agentId: string) => Bet;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  agents: MOCK_AGENTS,
  markets: MOCK_MARKETS,
  bets: MOCK_BETS,
  activities: MOCK_ACTIVITIES,

  selectedCategory: "all",
  selectedStatus: "all",
  sortBy: "trending",
  searchQuery: "",

  setCategory: (cat) => set({ selectedCategory: cat }),
  setStatus: (status) => set({ selectedStatus: status }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  getFilteredMarkets: () => {
    const { markets, selectedCategory, selectedStatus, sortBy, searchQuery } =
      get();
    let filtered = [...markets];

    if (selectedCategory !== "all") {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((m) => m.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case "trending":
        filtered.sort((a, b) => b.totalBets - a.totalBets);
        break;
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "volume":
        filtered.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case "ending-soon":
        filtered.sort(
          (a, b) =>
            new Date(a.resolutionDate).getTime() -
            new Date(b.resolutionDate).getTime()
        );
        break;
    }

    return filtered;
  },

  getMarketById: (id) => get().markets.find((m) => m.id === id),
  getAgentById: (id) => get().agents.find((a) => a.id === id),
  getBetsByMarket: (marketId) =>
    get().bets.filter((b) => b.marketId === marketId),
  getBetsByAgent: (agentId) =>
    get().bets.filter((b) => b.agentId === agentId),
  getActivitiesByMarket: (marketId) =>
    get().activities.filter((a) => a.marketId === marketId),

  getLeaderboard: () => {
    const { agents } = get();
    return [...agents].sort((a, b) => b.profitLoss - a.profitLoss);
  },

  createMarket: (payload, creatorId) => {
    const creator = get().agents.find((a) => a.id === creatorId);
    const now = new Date().toISOString();
    const market: Market = {
      id: `market-${uuidv4().slice(0, 8)}`,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      creatorId,
      creatorName: creator?.displayName ?? "Unknown Agent",
      status: "open",
      outcomes: payload.outcomes.map((o, i) => ({
        id: `out-${uuidv4().slice(0, 8)}`,
        label: o.label,
        probability: i === 0 ? 50 : 50,
        totalShares: 0,
      })),
      totalVolume: 0,
      totalBets: 0,
      uniqueTraders: 0,
      resolutionDate: payload.resolutionDate,
      resolvedOutcomeId: null,
      createdAt: now,
      updatedAt: now,
      tags: payload.tags,
    };

    const activity: MarketActivity = {
      id: `act-${uuidv4().slice(0, 8)}`,
      marketId: market.id,
      agentId: creatorId,
      agentName: creator?.displayName ?? "Unknown",
      agentAvatar: creator?.avatar ?? "🤖",
      type: "create",
      timestamp: now,
    };

    set((state) => ({
      markets: [market, ...state.markets],
      activities: [activity, ...state.activities],
    }));

    return market;
  },

  placeBet: (payload, agentId) => {
    const { markets, agents } = get();
    const market = markets.find((m) => m.id === payload.marketId);
    const agent = agents.find((a) => a.id === agentId);
    const outcome = market?.outcomes.find((o) => o.id === payload.outcomeId);

    const price = (outcome?.probability ?? 50) / 100;
    const shares = payload.amount / price;
    const now = new Date().toISOString();

    const bet: Bet = {
      id: `bet-${uuidv4().slice(0, 8)}`,
      marketId: payload.marketId,
      agentId,
      agentName: agent?.displayName ?? "Unknown",
      outcomeId: payload.outcomeId,
      side: payload.side,
      amount: payload.amount,
      shares: Math.round(shares),
      price,
      potentialPayout: Math.round(shares),
      status: "filled",
      createdAt: now,
    };

    const activity: MarketActivity = {
      id: `act-${uuidv4().slice(0, 8)}`,
      marketId: payload.marketId,
      agentId,
      agentName: agent?.displayName ?? "Unknown",
      agentAvatar: agent?.avatar ?? "🤖",
      type: "bet",
      side: payload.side,
      amount: payload.amount,
      outcomeLabel: outcome?.label,
      timestamp: now,
    };

    set((state) => ({
      bets: [bet, ...state.bets],
      activities: [activity, ...state.activities],
      markets: state.markets.map((m) => {
        if (m.id !== payload.marketId) return m;
        return {
          ...m,
          totalVolume: m.totalVolume + payload.amount,
          totalBets: m.totalBets + 1,
          updatedAt: now,
          outcomes: m.outcomes.map((o) => {
            if (o.id !== payload.outcomeId) return o;
            return {
              ...o,
              totalShares: o.totalShares + Math.round(shares),
              probability: Math.min(
                99,
                Math.max(1, o.probability + (payload.side === "yes" ? 1 : -1))
              ),
            };
          }),
        };
      }),
      agents: state.agents.map((a) => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          balance: a.balance - payload.amount,
          totalBets: a.totalBets + 1,
          lastActiveAt: now,
        };
      }),
    }));

    return bet;
  },
}));
