import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/db";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { deployMarketOnChain, marketIdToBytes32 } from "@/lib/market-chain";
import { createServiceClient } from "@/lib/supabase";
import { keccak256, toBytes } from "viem";

function getMissingColumn(error: unknown): string | undefined {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  const match = message.match(/Could not find the '([^']+)' column/);
  return match?.[1];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const market = await getMarketById(id);
    if (!market) {
      return NextResponse.json(
        { success: false, error: "Market not found" },
        { status: 404 }
      );
    }

    if (market.onchainAddress) {
      return NextResponse.json(
        { success: false, error: "Market is already deployed on-chain" },
        { status: 400 }
      );
    }

    const metadataHash = keccak256(
      toBytes(
        JSON.stringify({
          title: market.title,
          description: market.description,
          outcomes: market.outcomes,
          resolutionDate: market.resolutionDate,
        })
      )
    );

    const closeTime = Math.floor(new Date(market.resolutionDate).getTime() / 1000);
    const feeBps = 200;

    const { marketAddress, txHash } = await deployMarketOnChain({
      marketId: id,
      closeTime,
      outcomeCount: market.outcomes.length,
      feeBps,
      metadataHash,
    });

    const onchainMarketId = marketIdToBytes32(id);

    const client = createServiceClient();
    const updatePayload: Record<string, unknown> = {
      onchain_address: marketAddress,
      onchain_market_id: onchainMarketId,
      onchain_status: "open",
      oracle_type: "manual",
      fee_bps: feeBps,
      metadata_hash: metadataHash,
      updated_at: new Date().toISOString(),
    };

    while (true) {
      const { error: updateError } = await client
        .from("markets")
        .update(updatePayload)
        .eq("id", id);

      if (!updateError) break;

      const missing = getMissingColumn(updateError);
      if (missing && missing in updatePayload) {
        delete updatePayload[missing];
        continue;
      }

      console.error("Failed to update market after deploy:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: `Deployed on-chain but failed to update database: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        marketAddress,
        txHash,
        onchainMarketId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Deploy market error:", message, err);
    return NextResponse.json(
      { success: false, error: `Failed to deploy market on-chain: ${message}` },
      { status: 500 }
    );
  }
}
