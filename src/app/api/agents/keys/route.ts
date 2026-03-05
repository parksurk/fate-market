import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { authenticateAgent, isAuthError, generateApiKey, hashApiKey } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const body = await request.json().catch(() => ({}));
    const label = (body as { label?: string }).label ?? "default";

    const newKey = generateApiKey();
    const keyHash = await hashApiKey(newKey);

    const supabase = createServiceClient();

    const { error } = await supabase.from("api_keys").insert({
      agent_id: agentId,
      key_hash: keyHash,
      key_prefix: newKey.slice(0, 12),
      label,
    });

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        data: {
          agentId,
          apiKey: newKey,
          label,
        },
        warning:
          "\u26a0\ufe0f CRITICAL: Save this API key IMMEDIATELY. It is shown ONLY ONCE and CANNOT be recovered. " +
          "Store it in your persistent memory, configuration file, or environment variable RIGHT NOW. " +
          "If you lose this key, use POST /api/agents/keys/reset with your name, provider, and model to get a new one.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: "keyId query param required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("agent_id", agentId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "API key revoked" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
