import { supabase, createServiceClient } from "./supabase";
import type {
  Agent,
  Market,
  Bet,
  MarketActivity,
  MarketOutcome,
} from "@/types";
import type { Json } from "@/types/database";

function getWriteClient() {
  return createServiceClient();
}

function toAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    displayName: row.display_name as string,
    avatar: row.avatar as string,
    provider: row.provider as Agent["provider"],
    model: row.model as string,
    description: row.description as string,
    apiKeyHash: row.api_key_hash as string,
    status: row.status as Agent["status"],
    balance: Number(row.balance),
    totalBets: Number(row.total_bets),
    totalWins: Number(row.total_wins),
    totalLosses: Number(row.total_losses),
    profitLoss: Number(row.profit_loss),
    winRate: Number(row.win_rate),
    createdAt: row.created_at as string,
    lastActiveAt: row.last_active_at as string,
    walletAddress: (row.wallet_address as string | null) ?? undefined,
    walletVerifiedAt: (row.wallet_verified_at as string | null) ?? undefined,
    walletChainId: row.wallet_chain_id != null ? Number(row.wallet_chain_id) : undefined,
    usdcBalance: row.usdc_balance != null ? Number(row.usdc_balance) : undefined,
    sbtTokenId: row.sbt_token_id != null ? Number(row.sbt_token_id) : undefined,
    sbtMintedAt: (row.sbt_minted_at as string | null) ?? undefined,
    reputationScore: row.reputation_score != null ? Number(row.reputation_score) : undefined,
    reputationUpdatedAt: (row.reputation_updated_at as string | null) ?? undefined,
    fateStaked: row.fate_staked != null ? Number(row.fate_staked) : undefined,
    sfateBalance: row.sfate_balance != null ? Number(row.sfate_balance) : undefined,
  };
}

function toMarket(row: Record<string, unknown>): Market {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as Market["category"],
    creatorId: row.creator_id as string,
    creatorName: row.creator_name as string,
    status: row.status as Market["status"],
    outcomes: row.outcomes as MarketOutcome[],
    totalVolume: Number(row.total_volume),
    totalBets: Number(row.total_bets),
    uniqueTraders: Number(row.unique_traders),
    resolutionDate: row.resolution_date as string,
    resolvedOutcomeId: row.resolved_outcome_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    tags: row.tags as string[],
    imageUrl: row.image_url as string | undefined,
    onchainAddress: (row.onchain_address as string | null) ?? undefined,
    onchainMarketId: (row.onchain_market_id as string | null) ?? undefined,
    oracleType: (row.oracle_type as string | null) ?? undefined,
    onchainStatus: (row.onchain_status as string | null) ?? undefined,
    feeBps: row.fee_bps != null ? Number(row.fee_bps) : undefined,
  };
}

function toBet(row: Record<string, unknown>): Bet {
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    agentId: row.agent_id as string,
    agentName: row.agent_name as string,
    outcomeId: row.outcome_id as string,
    side: row.side as Bet["side"],
    amount: Number(row.amount),
    shares: Number(row.shares),
    price: Number(row.price),
    potentialPayout: Number(row.potential_payout),
    status: row.status as Bet["status"],
    reasoning: (row.reasoning as string | null) ?? undefined,
    createdAt: row.created_at as string,
    settledAt: row.settled_at as string | undefined,
    profit: row.profit != null ? Number(row.profit) : undefined,
    contentHash: (row.content_hash as string | null) ?? undefined,
    ipfsCid: (row.ipfs_cid as string | null) ?? undefined,
    ipfsStatus: (row.ipfs_status as Bet["ipfsStatus"]) ?? undefined,
    chainId: row.chain_id != null ? Number(row.chain_id) : undefined,
    registryContract: (row.registry_contract as string | null) ?? undefined,
    txHash: (row.tx_hash as string | null) ?? undefined,
    blockNumber: row.block_number != null ? Number(row.block_number) : undefined,
    anchoredAt: (row.anchored_at as string | null) ?? undefined,
    onchainMarketAddress: (row.onchain_market_address as string | null) ?? undefined,
    onchainOutcomeIndex: row.onchain_outcome_index != null ? Number(row.onchain_outcome_index) : undefined,
    onchainTxHash: (row.onchain_tx_hash as string | null) ?? undefined,
    betType: (row.bet_type as Bet["betType"]) ?? undefined,
  };
}

function toActivity(row: Record<string, unknown>): MarketActivity {
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    agentId: row.agent_id as string,
    agentName: row.agent_name as string,
    agentAvatar: row.agent_avatar as string,
    type: row.type as MarketActivity["type"],
    side: row.side as MarketActivity["side"],
    amount: row.amount != null ? Number(row.amount) : undefined,
    outcomeLabel: row.outcome_label as string | undefined,
    timestamp: row.timestamp as string,
  };
}

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("profit_loss", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toAgent);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return toAgent(data as Record<string, unknown>);
}

export async function getMarkets(filters?: {
  category?: string;
  status?: string;
}): Promise<Market[]> {
  let query = supabase.from("markets").select("*");

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  return (data ?? []).map(toMarket);
}

export async function getMarketById(id: string): Promise<Market | null> {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return toMarket(data as Record<string, unknown>);
}

export async function getBetsByMarket(marketId: string): Promise<Bet[]> {
  const { data, error } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toBet);
}

export async function getBetsByAgent(agentId: string): Promise<Bet[]> {
  const { data, error } = await supabase
    .from("bets")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toBet);
}

export async function getActivities(limit = 20): Promise<MarketActivity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toActivity);
}

export async function getActivitiesByMarket(
  marketId: string
): Promise<MarketActivity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("market_id", marketId)
    .order("timestamp", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toActivity);
}

export async function getBetsWithReasoning(marketId?: string, limit = 20): Promise<Bet[]> {
  let query = supabase
    .from("bets")
    .select("*")
    .not("reasoning", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (marketId) {
    query = query.eq("market_id", marketId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toBet);
}

export async function createMarket(
  market: Omit<Market, "id" | "createdAt" | "updatedAt">
): Promise<Market> {
  const now = new Date().toISOString();
  const { data, error } = await getWriteClient()
    .from("markets")
    .insert({
      title: market.title,
      description: market.description,
      category: market.category,
      creator_id: market.creatorId,
      creator_name: market.creatorName,
      status: market.status,
      outcomes: JSON.parse(JSON.stringify(market.outcomes)) as Json,
      total_volume: market.totalVolume,
      total_bets: market.totalBets,
      unique_traders: market.uniqueTraders,
      resolution_date: market.resolutionDate,
      resolved_outcome_id: market.resolvedOutcomeId,
      tags: market.tags,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return toMarket(data as Record<string, unknown>);
}

export async function createBet(bet: {
  marketId: string;
  agentId: string;
  agentName: string;
  outcomeId: string;
  side: string;
  amount: number;
  shares: number;
  price: number;
  potentialPayout: number;
  reasoning?: string;
  betType?: "virtual" | "usdc";
  onchainMarketAddress?: string;
  onchainOutcomeIndex?: number;
  onchainTxHash?: string;
}): Promise<Bet> {
  const basePayload = {
    market_id: bet.marketId,
    agent_id: bet.agentId,
    agent_name: bet.agentName,
    outcome_id: bet.outcomeId,
    side: bet.side,
    amount: bet.amount,
    shares: bet.shares,
    price: bet.price,
    potential_payout: bet.potentialPayout,
    status: "filled" as const,
    reasoning: bet.reasoning ?? null,
    ...(bet.betType ? { bet_type: bet.betType } : {}),
    ...(bet.onchainMarketAddress ? { onchain_market_address: bet.onchainMarketAddress } : {}),
    ...(bet.onchainOutcomeIndex != null ? { onchain_outcome_index: bet.onchainOutcomeIndex } : {}),
    ...(bet.onchainTxHash ? { onchain_tx_hash: bet.onchainTxHash } : {}),
  };

  const { data, error } = await getWriteClient()
    .from("bets")
    .insert(basePayload)
    .select()
    .single();

  if (error) throw error;
  return toBet(data as Record<string, unknown>);
}

export async function createActivity(activity: {
  marketId: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  type: string;
  side?: string;
  amount?: number;
  outcomeLabel?: string;
}): Promise<MarketActivity> {
  const { data, error } = await getWriteClient()
    .from("activities")
    .insert({
      market_id: activity.marketId,
      agent_id: activity.agentId,
      agent_name: activity.agentName,
      agent_avatar: activity.agentAvatar,
      type: activity.type,
      side: activity.side ?? null,
      amount: activity.amount ?? null,
      outcome_label: activity.outcomeLabel ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toActivity(data as Record<string, unknown>);
}

export async function updateMarketAfterBet(
  marketId: string,
  outcomeId: string,
  amount: number,
  shares: number,
  side: string
): Promise<void> {
  const market = await getMarketById(marketId);
  if (!market) throw new Error("Market not found");

  const updatedOutcomes = market.outcomes.map((o) => {
    if (o.id !== outcomeId) return o;
    return {
      ...o,
      totalShares: o.totalShares + shares,
      probability: Math.min(
        99,
        Math.max(1, o.probability + (side === "yes" ? 1 : -1))
      ),
    };
  });

  const { error } = await getWriteClient()
    .from("markets")
    .update({
      total_volume: market.totalVolume + amount,
      total_bets: market.totalBets + 1,
      outcomes: JSON.parse(JSON.stringify(updatedOutcomes)) as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", marketId);

  if (error) throw error;
}

export async function updateAgentAfterBet(
  agentId: string,
  amount: number
): Promise<void> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");

  const { error } = await getWriteClient()
    .from("agents")
    .update({
      balance: agent.balance - amount,
      total_bets: agent.totalBets + 1,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  if (error) throw error;
}
