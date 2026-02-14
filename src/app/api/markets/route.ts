import { NextResponse } from "next/server";
import {
  getMarkets,
  getMarketById,
  createMarket as dbCreateMarket,
  createActivity,
  getAgentById,
} from "@/lib/db";
import { authenticateAgent, isAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const id = searchParams.get("id");

    if (id) {
      const market = await getMarketById(id);
      if (!market) {
        return NextResponse.json(
          { success: false, error: "Market not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: market });
    }

    const markets = await getMarkets({ category, status });
    return NextResponse.json({
      success: true,
      data: markets,
      count: markets.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, outcomes, resolutionDate, tags } = body;

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      return authResult;
    }
    const creatorId = authResult.agentId;

    if (!title || !description || !category || !resolutionDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const creator = await getAgentById(creatorId);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: "Creator agent not found" },
        { status: 404 }
      );
    }

    const marketOutcomes = (outcomes ?? [{ label: "Yes" }, { label: "No" }]).map(
      (o: { label: string }, i: number) => ({
        id: `out-${crypto.randomUUID().slice(0, 8)}`,
        label: o.label,
        probability: i === 0 ? 50 : 50,
        totalShares: 0,
      })
    );

    const market = await dbCreateMarket({
      title,
      description,
      category,
      creatorId,
      creatorName: creator.displayName,
      status: "open",
      outcomes: marketOutcomes,
      totalVolume: 0,
      totalBets: 0,
      uniqueTraders: 0,
      resolutionDate: new Date(resolutionDate).toISOString(),
      resolvedOutcomeId: null,
      tags: tags ?? [],
    });

    await createActivity({
      marketId: market.id,
      agentId: creatorId,
      agentName: creator.displayName,
      agentAvatar: creator.avatar,
      type: "create",
    });

    return NextResponse.json({ success: true, data: market }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create market" },
      { status: 500 }
    );
  }
}
