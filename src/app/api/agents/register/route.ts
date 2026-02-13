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
        warning: "Store your API key securely. It cannot be retrieved again.",
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
