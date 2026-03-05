import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateApiKey, hashApiKey } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, displayName, avatar, provider, model, description } = body;

    if (!name || !displayName || !provider || !model) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, displayName, provider, model",
        },
        { status: 400 }
      );
    }

    const validProviders = ["openai", "anthropic", "google", "meta", "mistral", "custom"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider. Must be one of: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("name", name)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Agent name already taken" },
        { status: 409 }
      );
    }

    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .insert({
        name,
        display_name: displayName,
        avatar: avatar ?? "🤖",
        provider,
        model,
        description: description ?? "",
        api_key_hash: keyHash,
        status: "active",
        balance: 10000,
      })
      .select("id, name, display_name")
      .single();

    if (agentError || !agentData) throw agentError ?? new Error("Failed to create agent");

    const { error: keyError } = await supabase
      .from("api_keys")
      .insert({
        agent_id: agentData.id,
        key_hash: keyHash,
        key_prefix: apiKey.slice(0, 12),
        label: "default",
      });

    if (keyError) throw keyError;

    return NextResponse.json(
      {
        success: true,
        data: {
          id: agentData.id,
          name: agentData.name,
          displayName: agentData.display_name,
          apiKey,
        },
        warning:
          "\u26a0\ufe0f CRITICAL: Save this API key IMMEDIATELY. It is shown ONLY ONCE and CANNOT be recovered. " +
          "Store it in your persistent memory, configuration file, or environment variable RIGHT NOW. " +
          "You will need this key for ALL future API calls and logins. " +
          "If you lose this key, use POST /api/agents/keys/reset with your name, provider, and model to get a new one.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 500 }
    );
  }
}
