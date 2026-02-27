import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/db";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import {
  getRelayerWallet,
  marketIdToBytes32,
  publicClient,
  getOracleAddress,
  MANUAL_ORACLE_ABI,
} from "@/lib/market-chain";
import { keccak256, toBytes, decodeEventLog } from "viem";

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
    const body = await request.json();
    const { outcome, evidenceHash } = body;

    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const adminId = process.env.ADMIN_AGENT_ID;
    if (adminId && authResult.agentId !== adminId) {
      return NextResponse.json(
        { success: false, error: "Only admin can resolve markets" },
        { status: 403 }
      );
    }

    if (outcome !== 0 && outcome !== 1) {
      return NextResponse.json(
        { success: false, error: "Outcome must be 0 (YES) or 1 (NO)" },
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

    const wallet = getRelayerWallet();
    const oracleAddress = getOracleAddress();
    const marketIdBytes = marketIdToBytes32(id);

    const requestTxHash = await wallet.writeContract({
      address: oracleAddress,
      abi: MANUAL_ORACLE_ABI,
      functionName: "requestResolution",
      args: [
        market.onchainAddress as `0x${string}`,
        marketIdBytes,
        "0x" as `0x${string}`,
      ],
    });

    const requestReceipt = await publicClient.waitForTransactionReceipt({
      hash: requestTxHash,
    });

    let requestId: `0x${string}` | undefined;
    for (const log of requestReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: MANUAL_ORACLE_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "ResolutionRequested") {
          requestId = (decoded.args as { requestId: `0x${string}` }).requestId;
          break;
        }
      } catch {
        // skip logs from other contracts
      }
    }

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Failed to extract requestId from transaction" },
        { status: 500 }
      );
    }

    const evidenceHashBytes: `0x${string}` = evidenceHash
      ? (evidenceHash as `0x${string}`)
      : keccak256(toBytes(`resolve:${id}:${outcome}:${Date.now()}`));

    const resolveTxHash = await wallet.writeContract({
      address: oracleAddress,
      abi: MANUAL_ORACLE_ABI,
      functionName: "resolve",
      args: [requestId, outcome, evidenceHashBytes],
    });

    await publicClient.waitForTransactionReceipt({ hash: resolveTxHash });

    const disputeDeadline = new Date(Date.now() + 3600 * 1000).toISOString();

    const client = createServiceClient();
    const updatePayload: Record<string, unknown> = {
      oracle_request_id: requestId,
      resolution_tx_hash: resolveTxHash,
      resolution_evidence_hash: evidenceHashBytes,
      onchain_status: "proposed",
      dispute_deadline: disputeDeadline,
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

      console.error("Failed to update market after resolve:", updateError);
      break;
    }

    return NextResponse.json({
      success: true,
      data: {
        requestId,
        txHash: resolveTxHash,
        disputeDeadline,
      },
    });
  } catch (err) {
    console.error("Resolve market error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to resolve market" },
      { status: 500 }
    );
  }
}
