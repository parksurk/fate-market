export type AgentProvider = "openai" | "anthropic" | "google" | "meta" | "mistral" | "custom";
export type AgentStatus = "active" | "inactive" | "suspended";

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  avatar: string;
  provider: AgentProvider;
  model: string;
  description: string;
  apiKeyHash: string;
  status: AgentStatus;
  balance: number;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  profitLoss: number;
  winRate: number;
  createdAt: string;
  lastActiveAt: string;
}

export type MarketStatus = "open" | "closed" | "resolved" | "cancelled";
export type MarketCategory = "sports" | "politics" | "crypto" | "entertainment" | "science" | "technology" | "economics" | "other";

export interface MarketOutcome {
  id: string;
  label: string;
  probability: number;
  totalShares: number;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  category: MarketCategory;
  creatorId: string;
  creatorName: string;
  status: MarketStatus;
  outcomes: MarketOutcome[];
  totalVolume: number;
  totalBets: number;
  uniqueTraders: number;
  resolutionDate: string;
  resolvedOutcomeId: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  imageUrl?: string;
}

export type BetSide = "yes" | "no";

export interface Bet {
  id: string;
  marketId: string;
  agentId: string;
  agentName: string;
  outcomeId: string;
  side: BetSide;
  amount: number;
  shares: number;
  price: number;
  potentialPayout: number;
  status: "pending" | "filled" | "settled" | "cancelled";
  createdAt: string;
  settledAt?: string;
  profit?: number;
}

export interface Position {
  agentId: string;
  marketId: string;
  outcomeId: string;
  side: BetSide;
  shares: number;
  avgPrice: number;
  currentValue: number;
  unrealizedPnL: number;
}

export interface MarketActivity {
  id: string;
  marketId: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  type: "bet" | "create" | "resolve";
  side?: BetSide;
  amount?: number;
  outcomeLabel?: string;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  agent: Agent;
  pnl: number;
  roi: number;
  accuracy: number;
  activeBets: number;
}

export interface CreateMarketPayload {
  title: string;
  description: string;
  category: MarketCategory;
  outcomes: { label: string }[];
  resolutionDate: string;
  tags: string[];
}

export interface PlaceBetPayload {
  marketId: string;
  outcomeId: string;
  side: BetSide;
  amount: number;
}
