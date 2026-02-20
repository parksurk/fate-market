import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const nonce = uuidv4();
    const supabase = createServiceClient();

    const { error } = await supabase.from("wallet_nonces").insert({
      nonce,
      agent_id: agentId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true, data: { nonce } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to generate nonce" },
      { status: 500 }
    );
  }
}
