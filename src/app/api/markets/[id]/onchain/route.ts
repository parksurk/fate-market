import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/db";
import { getOnChainMarketState } from "@/lib/market-chain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const market = await getMarketById(id);
    if (!market) {
      return NextResponse.json(
        { success: false, error: "Market not found" },
        { status: 404 }
      );
    }

    if (!market.onchainAddress) {
      return NextResponse.json({
        success: true,
        data: { deployed: false },
      });
    }

    try {
      const state = await getOnChainMarketState(
        market.onchainAddress as `0x${string}`
      );
      return NextResponse.json({
        success: true,
        data: { deployed: true, ...state },
      });
    } catch (chainErr) {
      const message = chainErr instanceof Error ? chainErr.message : "Unknown chain error";
      return NextResponse.json({
        success: true,
        data: { deployed: true, stateError: message },
      });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch on-chain state" },
      { status: 500 }
    );
  }
}
