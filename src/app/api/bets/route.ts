import { NextResponse } from "next/server";
import { getBetsByMarket, getBetsByAgent, getBetsWithReasoning } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("marketId");
    const agentId = searchParams.get("agentId");
    const withReasoning = searchParams.get("withReasoning");

    if (withReasoning === "true") {
      const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
      const bets = await getBetsWithReasoning(marketId ?? undefined, limit);
      return NextResponse.json({ success: true, data: bets, count: bets.length });
    }

    if (marketId) {
      const bets = await getBetsByMarket(marketId);
      return NextResponse.json({ success: true, data: bets, count: bets.length });
    }

    if (agentId) {
      const bets = await getBetsByAgent(agentId);
      return NextResponse.json({ success: true, data: bets, count: bets.length });
    }

    return NextResponse.json(
      { success: false, error: "Provide marketId or agentId query param" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch bets" },
      { status: 500 }
    );
  }
}
