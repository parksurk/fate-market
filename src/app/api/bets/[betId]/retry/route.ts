import { NextResponse } from "next/server";
import {
  getMarketById,
  getAgentById,
  updateBetStatus,
  createActivity,
  updateMarketAfterBet,
} from "@/lib/db";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { placeBetOnChain, marketIdToBytes32 } from "@/lib/market-chain";
import { supabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ betId: string }> }
) {
  try {
    const { betId } = await params;

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      return authResult;
    }
    const agentId = authResult.agentId;

    const { data: rawBetRow, error: betError } = await supabase
      .from("bets")
      .select("*")
      .eq("id", betId)
      .single();
    const betRow = rawBetRow as Record<string, unknown> | null;

    if (betError || !betRow) {
      return NextResponse.json(
        { success: false, error: "Bet not found" },
        { status: 404 }
      );
    }

    if (betRow.agent_id !== agentId) {
      return NextResponse.json(
        { success: false, error: "Not your bet" },
        { status: 403 }
      );
    }

    if (betRow.status !== "failed") {
      return NextResponse.json(
        { success: false, error: `Bet status is '${betRow.status}', only 'failed' bets can be retried` },
        { status: 400 }
      );
    }

    if (betRow.bet_type !== "usdc") {
      return NextResponse.json(
        { success: false, error: "Only USDC bets can be retried" },
        { status: 400 }
      );
    }

    const market = await getMarketById(betRow.market_id as string);
    if (!market || market.status !== "open" || !market.onchainAddress) {
      return NextResponse.json(
        { success: false, error: "Market is no longer open for betting" },
        { status: 400 }
      );
    }

    const agent = await getAgentById(agentId);
    if (!agent?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Agent has no linked wallet" },
        { status: 400 }
      );
    }

    const amount = Number(betRow.amount);
    const usdcAmount = BigInt(Math.round(amount * 1_000_000));
    const outcomeIndex = betRow.onchain_outcome_index as number;
    const offchainBetId = (betRow.offchain_bet_id as string) ||
      marketIdToBytes32(`${betRow.market_id}-${agentId}-${Date.now()}`);

    await updateBetStatus(betId, "pending");

    try {
      const { txHash: onchainTxHash, pullTxHash } = await placeBetOnChain({
        marketAddress: market.onchainAddress as `0x${string}`,
        outcome: outcomeIndex,
        amount: usdcAmount,
        agentWallet: agent.walletAddress as `0x${string}`,
        offchainBetId: offchainBetId as `0x${string}`,
      });

      await updateBetStatus(betId, "filled", {
        onchainTxHash,
        onchainPullTxHash: pullTxHash,
      });

      const outcome = market.outcomes.find((o) => o.id === betRow.outcome_id);
      const shares = Number(betRow.shares);

      await Promise.all([
        updateMarketAfterBet(betRow.market_id as string, betRow.outcome_id as string, amount, shares, betRow.side as string),
        createActivity({
          marketId: betRow.market_id as string,
          agentId,
          agentName: agent.displayName,
          agentAvatar: agent.avatar,
          type: "bet",
          side: betRow.side as string,
          amount,
          outcomeLabel: outcome?.label,
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: { betId, status: "filled", onchainTxHash, pullTxHash },
      });
    } catch (chainError: unknown) {
      const chainMsg = chainError instanceof Error ? chainError.message : "On-chain transaction failed";
      await updateBetStatus(betId, "failed", { errorMessage: chainMsg });
      return NextResponse.json(
        { success: false, error: `Retry failed: ${chainMsg}`, betId },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[BET_RETRY] Failed:", message, error);
    return NextResponse.json(
      { success: false, error: `Retry failed: ${message}` },
      { status: 500 }
    );
  }
}
