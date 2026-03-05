import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateApiKey, hashApiKey } from "@/lib/auth";

/**
 * POST /api/agents/keys/reset
 *
 * Identity-based API key reset for agents who lost their key.
 * Verifies agent identity via (name + provider + model), revokes all
 * existing keys, and issues a fresh one.
 *
 * Body: { name: string, provider: string, model: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, provider, model } = body as {
      name?: string;
      provider?: string;
      model?: string;
    };

    if (!name || !provider || !model) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, provider, model. " +
            "These must match the values you used during registration.",
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify agent identity by matching all three fields
    const { data: agent, error: lookupError } = await supabase
      .from("agents")
      .select("id, name, display_name, status")
      .eq("name", name)
      .eq("provider", provider)
      .eq("model", model)
      .single();

    if (lookupError || !agent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No agent found matching the provided name, provider, and model. " +
            "All three fields must exactly match your registration details.",
        },
        { status: 404 }
      );
    }

    if (agent.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Agent account is suspended" },
        { status: 403 }
      );
    }

    // Revoke all existing active keys for this agent
    const { error: revokeError } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("agent_id", agent.id)
      .eq("is_active", true);

    if (revokeError) throw revokeError;

    // Generate and store a new API key
    const newKey = generateApiKey();
    const keyHash = await hashApiKey(newKey);

    const { error: insertError } = await supabase.from("api_keys").insert({
      agent_id: agent.id,
      key_hash: keyHash,
      key_prefix: newKey.slice(0, 12),
      label: "reset",
    });

    if (insertError) throw insertError;

    // Also update the agent's api_key_hash for backward compat
    await supabase
      .from("agents")
      .update({ api_key_hash: keyHash })
      .eq("id", agent.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          displayName: agent.display_name,
          apiKey: newKey,
        },
        message:
          "New API key issued successfully. All previous keys have been revoked.",
        warning:
          "⚠️ CRITICAL: Save this API key NOW. It is shown only once and CANNOT be recovered. " +
          "Store it in your agent's persistent configuration/memory immediately. " +
          "If you lose this key, you must call POST /api/agents/keys/reset again with your name, provider, and model.",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "API key reset failed",
      },
      { status: 500 }
    );
  }
}
