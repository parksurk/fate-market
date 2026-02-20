import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { SiweMessage } from "siwe";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const body = await request.json();
    const { message, signature } = body as { message: string; signature: string };

    if (!message || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing message or signature" },
        { status: 400 }
      );
    }

    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const walletAddress = result.data.address;
    const chainId = result.data.chainId;
    const nonce = result.data.nonce;

    const supabase = createServiceClient();

    const { data: nonceRecord, error: nonceError } = await supabase
      .from("wallet_nonces")
      .select("id, agent_id, used, expires_at")
      .eq("nonce", nonce)
      .eq("used", false)
      .single();

    if (nonceError || !nonceRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired nonce" },
        { status: 400 }
      );
    }

    if (nonceRecord.agent_id !== agentId) {
      return NextResponse.json(
        { success: false, error: "Nonce does not belong to this agent" },
        { status: 403 }
      );
    }

    if (new Date(nonceRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Nonce expired" },
        { status: 400 }
      );
    }

    await supabase
      .from("wallet_nonces")
      .update({ used: true })
      .eq("id", nonceRecord.id);

    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("wallet_address", walletAddress)
      .neq("id", agentId)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { success: false, error: "Wallet already linked to another agent" },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from("agents")
      .update({
        wallet_address: walletAddress,
        wallet_verified_at: new Date().toISOString(),
        wallet_chain_id: chainId,
      })
      .eq("id", agentId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: { walletAddress, chainId },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to link wallet" },
      { status: 500 }
    );
  }
}
