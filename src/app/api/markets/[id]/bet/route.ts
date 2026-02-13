import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/mock-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const market = getMarketById(id);
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

  const { agentId, outcomeId, side, amount } = body;

  if (!agentId || !outcomeId || !side || !amount) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: agentId, outcomeId, side, amount" },
      { status: 400 }
    );
  }

  if (amount <= 0) {
    return NextResponse.json(
      { success: false, error: "Amount must be positive" },
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

  return NextResponse.json({
    success: true,
    data: {
      betId: `bet-${Date.now()}`,
      marketId: id,
      agentId,
      outcomeId,
      side,
      amount,
      shares,
      price,
      potentialPayout: shares,
      status: "filled",
      createdAt: new Date().toISOString(),
    },
  });
}
