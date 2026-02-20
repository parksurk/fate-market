import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAgentReputationScore, getVaultInfo } from "@/lib/governance-chain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = createServiceClient();
    const { data: agent, error: agentError } = await client
      .from("agents")
      .select("sbt_token_id, reputation_score, reputation_updated_at")
      .eq("id", id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    let score = agent.reputation_score;
    let totalStaked = "0";
    let totalFollowFeesCollected = "0";
    let reputationUpdatedAt = agent.reputation_updated_at;

    if (agent.sbt_token_id) {
      try {
        const onChainScore = await getAgentReputationScore(BigInt(agent.sbt_token_id));
        score = onChainScore;

        const vaultInfo = await getVaultInfo(BigInt(agent.sbt_token_id));
        totalStaked = vaultInfo.totalStaked;
        totalFollowFeesCollected = vaultInfo.totalFollowFeesCollected;
      } catch (err) {
        console.error("Failed to fetch on-chain reputation data:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score,
        totalStaked,
        totalFollowFeesCollected,
        reputationUpdatedAt,
      },
    });
  } catch (err) {
    console.error("Get agent reputation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent reputation" },
      { status: 500 }
    );
  }
}
