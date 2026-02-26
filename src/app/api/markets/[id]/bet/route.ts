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
import { anchorBet } from "@/lib/bet-anchor";
import { getUsdcBalance, placeBetOnChain, marketIdToBytes32 } from "@/lib/market-chain";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { outcomeId, side, amount, reasoning } = body;
    const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet";
    const betType: "virtual" | "usdc" = isMainnet ? "usdc" : (body.betType === "usdc" ? "usdc" : "virtual");

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      return authResult;
    }
    const agentId = authResult.agentId;

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

    if (isMainnet && !market.onchainAddress) {
      return NextResponse.json(
        { success: false, error: "Market must be deployed on-chain for mainnet betting" },
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

    const outcome = market.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) {
      return NextResponse.json(
        { success: false, error: "Invalid outcome ID" },
        { status: 400 }
      );
    }

    const outcomeIndex = market.outcomes.findIndex((o) => o.id === outcomeId);

    if (betType === "usdc") {
      if (!market.onchainAddress) {
        return NextResponse.json(
          { success: false, error: "Market is not deployed on-chain" },
          { status: 400 }
        );
      }

      if (!agent.walletAddress) {
        return NextResponse.json(
          { success: false, error: "Agent has no linked wallet. Link a wallet via POST /api/wallet/link first." },
          { status: 400 }
        );
      }

      const price = outcome.probability / 100;
      const shares = Math.round(amount / price);
      const usdcAmount = BigInt(Math.round(amount * 1_000_000)); // USDC has 6 decimals

      // Generate deterministic offchainBetId for idempotency
      const offchainBetId = marketIdToBytes32(`${id}-${agentId}-${Date.now()}`);

      // Place bet on-chain via relayer (checks relayer balance + approval internally)
      const { txHash: onchainTxHash } = await placeBetOnChain({
        marketAddress: market.onchainAddress as `0x${string}`,
        outcome: outcomeIndex,
        amount: usdcAmount,
        receiver: agent.walletAddress as `0x${string}`,
        offchainBetId,
      });

      // On-chain success — record in DB
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
        reasoning: typeof reasoning === "string" ? reasoning.slice(0, 500) : undefined,
        betType: "usdc",
        onchainMarketAddress: market.onchainAddress,
        onchainOutcomeIndex: outcomeIndex,
        onchainTxHash,
      });

      await Promise.all([
        updateMarketAfterBet(id, outcomeId, amount, shares, side),
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
    }

    if (agent.balance < amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
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
      reasoning: typeof reasoning === "string" ? reasoning.slice(0, 500) : undefined,
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

    anchorBet(bet).catch(() => {});

    return NextResponse.json({ success: true, data: bet });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[BET] Failed to place bet:", message, error);
    return NextResponse.json(
      { success: false, error: `Failed to place bet: ${message}` },
      { status: 500 }
    );
  }
}
