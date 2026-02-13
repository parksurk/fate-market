import { create } from "zustand";
import {
  type Agent,
  type Market,
  type Bet,
  type MarketActivity,
  type MarketCategory,
  type MarketStatus,
} from "@/types";

type SortOption = "trending" | "newest" | "volume" | "ending-soon";

interface MarketStore {
  agents: Agent[];
  markets: Market[];
  bets: Bet[];
  activities: MarketActivity[];
  isLoading: boolean;
  isInitialized: boolean;

  selectedCategory: MarketCategory | "all";
  selectedStatus: MarketStatus | "all";
  sortBy: SortOption;
  searchQuery: string;

  setCategory: (cat: MarketCategory | "all") => void;
  setStatus: (status: MarketStatus | "all") => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (q: string) => void;

  initialize: () => Promise<void>;
  refreshMarkets: () => Promise<void>;
  refreshAgents: () => Promise<void>;

  getFilteredMarkets: () => Market[];
  getMarketById: (id: string) => Market | undefined;
  getAgentById: (id: string) => Agent | undefined;
  getBetsByMarket: (marketId: string) => Bet[];
  getBetsByAgent: (agentId: string) => Bet[];
  getActivitiesByMarket: (marketId: string) => MarketActivity[];
  getLeaderboard: () => Agent[];

  createMarket: (payload: {
    title: string;
    description: string;
    category: MarketCategory;
    outcomes: { label: string }[];
    resolutionDate: string;
    tags: string[];
  }, creatorId: string) => Promise<Market>;

  placeBet: (payload: {
    marketId: string;
    outcomeId: string;
    side: "yes" | "no";
    amount: number;
  }, agentId: string) => Promise<Bet>;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  agents: [],
  markets: [],
  bets: [],
  activities: [],
  isLoading: false,
  isInitialized: false,

  selectedCategory: "all",
  selectedStatus: "all",
  sortBy: "trending",
  searchQuery: "",

  setCategory: (cat) => set({ selectedCategory: cat }),
  setStatus: (status) => set({ selectedStatus: status }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      const [agents, markets, activities] = await Promise.all([
        apiFetch<Agent[]>("/api/agents"),
        apiFetch<Market[]>("/api/markets"),
        apiFetch<MarketActivity[]>("/api/activities?limit=50"),
      ]);
      set({ agents, markets, activities, isInitialized: true });
    } catch (err) {
      console.error("Failed to initialize store:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshMarkets: async () => {
    try {
      const markets = await apiFetch<Market[]>("/api/markets");
      set({ markets });
    } catch (err) {
      console.error("Failed to refresh markets:", err);
    }
  },

  refreshAgents: async () => {
    try {
      const agents = await apiFetch<Agent[]>("/api/agents");
      set({ agents });
    } catch (err) {
      console.error("Failed to refresh agents:", err);
    }
  },

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

  createMarket: async (payload, creatorId) => {
    const market = await apiFetch<Market>("/api/markets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, creatorId }),
    });

    const activities = await apiFetch<MarketActivity[]>("/api/activities?limit=50");
    set((state) => ({
      markets: [market, ...state.markets],
      activities,
    }));

    return market;
  },

  placeBet: async (payload, agentId) => {
    const bet = await apiFetch<Bet>(
      `/api/markets/${payload.marketId}/bet`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          outcomeId: payload.outcomeId,
          side: payload.side,
          amount: payload.amount,
        }),
      }
    );

    const [markets, agents, activities] = await Promise.all([
      apiFetch<Market[]>("/api/markets"),
      apiFetch<Agent[]>("/api/agents"),
      apiFetch<MarketActivity[]>("/api/activities?limit=50"),
    ]);

    set((state) => ({
      bets: [bet, ...state.bets],
      markets,
      agents,
      activities,
    }));

    return bet;
  },
}));
