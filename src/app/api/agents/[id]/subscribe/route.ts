import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isSubscriptionActive, getFollowFee } from "@/lib/governance-chain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const follower = url.searchParams.get("follower");

    if (!follower) {
      return NextResponse.json(
        { success: false, error: "Missing follower parameter" },
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
    const followerAddress = follower as `0x${string}`;

    const active = await isSubscriptionActive(tokenId, followerAddress);
    const followFee = await getFollowFee();

    return NextResponse.json({
      success: true,
      data: {
        active,
        followFee,
        periodDuration: "2592000",
      },
    });
  } catch (err) {
    console.error("Get subscription info error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription information" },
      { status: 500 }
    );
  }
}
