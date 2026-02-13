import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  MOCK_AGENTS,
  MOCK_MARKETS,
  MOCK_BETS,
  MOCK_ACTIVITIES,
} from "@/lib/mock-data";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();

  try {
    const agentRows = MOCK_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      display_name: a.displayName,
      avatar: a.avatar,
      provider: a.provider,
      model: a.model,
      description: a.description,
      api_key_hash: a.apiKeyHash,
      status: a.status,
      balance: a.balance,
      total_bets: a.totalBets,
      total_wins: a.totalWins,
      total_losses: a.totalLosses,
      profit_loss: a.profitLoss,
      win_rate: a.winRate,
      created_at: a.createdAt,
      last_active_at: a.lastActiveAt,
    }));

    const { error: agentError } = await supabase
      .from("agents")
      .upsert(agentRows, { onConflict: "id" });
    if (agentError) throw agentError;

    const marketRows = MOCK_MARKETS.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      creator_id: m.creatorId,
      creator_name: m.creatorName,
      status: m.status,
      outcomes: JSON.parse(JSON.stringify(m.outcomes)),
      total_volume: m.totalVolume,
      total_bets: m.totalBets,
      unique_traders: m.uniqueTraders,
      resolution_date: m.resolutionDate,
      resolved_outcome_id: m.resolvedOutcomeId,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
      tags: m.tags,
    }));

    const { error: marketError } = await supabase
      .from("markets")
      .upsert(marketRows, { onConflict: "id" });
    if (marketError) throw marketError;

    const betRows = MOCK_BETS.map((b) => ({
      id: b.id,
      market_id: b.marketId,
      agent_id: b.agentId,
      agent_name: b.agentName,
      outcome_id: b.outcomeId,
      side: b.side,
      amount: b.amount,
      shares: b.shares,
      price: b.price,
      potential_payout: b.potentialPayout,
      status: b.status,
      created_at: b.createdAt,
    }));

    const { error: betError } = await supabase
      .from("bets")
      .upsert(betRows, { onConflict: "id" });
    if (betError) throw betError;

    const activityRows = MOCK_ACTIVITIES.map((a) => ({
      id: a.id,
      market_id: a.marketId,
      agent_id: a.agentId,
      agent_name: a.agentName,
      agent_avatar: a.agentAvatar,
      type: a.type,
      side: a.side ?? null,
      amount: a.amount ?? null,
      outcome_label: a.outcomeLabel ?? null,
      timestamp: a.timestamp,
    }));

    const { error: activityError } = await supabase
      .from("activities")
      .upsert(activityRows, { onConflict: "id" });
    if (activityError) throw activityError;

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      counts: {
        agents: agentRows.length,
        markets: marketRows.length,
        bets: betRows.length,
        activities: activityRows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seed failed",
      },
      { status: 500 }
    );
  }
}
