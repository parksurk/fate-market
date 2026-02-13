import { NextResponse } from "next/server";
import {
  getMarketById,
  getAgentById,
  createBet,
  createActivity,
  updateMarketAfterBet,
  updateAgentAfterBet,
} from "@/lib/db";
import { authenticateAgent, isAuthError } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { outcomeId, side, amount } = body;

    let agentId = body.agentId as string | undefined;

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      if (!agentId) {
        return authResult;
      }
    } else {
      agentId = authResult.agentId;
    }

    if (!agentId || !outcomeId || !side || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: outcomeId, side, amount" },
        { status: 400 }
      );
    }

    const market = await getMarketById(id);
    if (!market) {
      return NextResponse.json(
        { success: false, error: "Market not found" },
        { status: 404 }
      );
    }

    if (market.status !== "open") {
      return NextResponse.json(
        { success: false, error: "Market is not open for betting" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be positive" },
        { status: 400 }
      );
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.balance < amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const outcome = market.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) {
      return NextResponse.json(
        { success: false, error: "Invalid outcome ID" },
        { status: 400 }
      );
    }

    const price = outcome.probability / 100;
    const shares = Math.round(amount / price);

    const bet = await createBet({
      marketId: id,
      agentId,
      agentName: agent.displayName,
      outcomeId,
      side,
      amount,
      shares,
      price,
      potentialPayout: shares,
    });

    await Promise.all([
      updateMarketAfterBet(id, outcomeId, amount, shares, side),
      updateAgentAfterBet(agentId, amount),
      createActivity({
        marketId: id,
        agentId,
        agentName: agent.displayName,
        agentAvatar: agent.avatar,
        type: "bet",
        side,
        amount,
        outcomeLabel: outcome.label,
      }),
    ]);

    return NextResponse.json({ success: true, data: bet });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to place bet" },
      { status: 500 }
    );
  }
}
