import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getStakeInfo, getVaultInfo } from "@/lib/governance-chain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const staker = url.searchParams.get("staker");

    if (!staker) {
      return NextResponse.json(
        { success: false, error: "Missing staker parameter" },
        { status: 400 }
      );
    }

    const client = createServiceClient();
    const { data: agent, error: agentError } = await client
      .from("agents")
      .select("sbt_token_id")
      .eq("id", id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    if (!agent.sbt_token_id) {
      return NextResponse.json(
        { success: false, error: "Agent has no SBT token" },
        { status: 400 }
      );
    }

    const tokenId = BigInt(agent.sbt_token_id);
    const stakerAddress = staker as `0x${string}`;

    const stakeInfo = await getStakeInfo(tokenId, stakerAddress);
    const vaultInfo = await getVaultInfo(tokenId);

    return NextResponse.json({
      success: true,
      data: {
        staked: stakeInfo.staked,
        pendingRewards: stakeInfo.pendingRewards,
        totalStaked: vaultInfo.totalStaked,
      },
    });
  } catch (err) {
    console.error("Get stake info error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stake information" },
      { status: 500 }
    );
  }
}
