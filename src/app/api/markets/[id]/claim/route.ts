import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/db";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import {
  getRelayerWallet,
  publicClient,
  PREDICTION_MARKET_ABI,
} from "@/lib/market-chain";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { receiverAddress } = body;

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    if (!receiverAddress || typeof receiverAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing receiverAddress" },
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

    if (!market.onchainAddress) {
      return NextResponse.json(
        { success: false, error: "Market is not deployed on-chain" },
        { status: 400 }
      );
    }

    const marketAddress = market.onchainAddress as `0x${string}`;

    const state = await publicClient.readContract({
      address: marketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: "state",
    });

    if (Number(state) !== 4) {
      return NextResponse.json(
        { success: false, error: "Market is not finalized. Current state: " + Number(state) },
        { status: 400 }
      );
    }

    const wallet = getRelayerWallet();

    const txHash = await wallet.writeContract({
      address: marketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: "claim",
      args: [receiverAddress as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      success: true,
      data: { txHash },
    });
  } catch (err) {
    console.error("Claim error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to claim winnings" },
      { status: 500 }
    );
  }
}
