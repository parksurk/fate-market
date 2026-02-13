import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

const API_KEY_PREFIX = "fate_";
const SALT_ROUNDS = 12;

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = API_KEY_PREFIX;
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const url = new URL(request.url);
  return url.searchParams.get("apiKey");
}

export async function authenticateAgent(
  request: Request
): Promise<{ agentId: string } | NextResponse> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing API key. Use Authorization: Bearer <key>" },
      { status: 401 }
    );
  }

  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return NextResponse.json(
      { success: false, error: "Invalid API key format" },
      { status: 401 }
    );
  }

  const keyPrefix = apiKey.slice(0, 12);
  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, agent_id, key_hash, is_active")
    .eq("key_prefix", keyPrefix)
    .eq("is_active", true);

  if (error || !keys) {
    return NextResponse.json(
      { success: false, error: "Authentication service unavailable" },
      { status: 503 }
    );
  }

  for (const key of keys) {
    const matches = await verifyApiKey(apiKey, key.key_hash);
    if (matches) {
      const { data: agent } = await supabase
        .from("agents")
        .select("status")
        .eq("id", key.agent_id)
        .single();

      if (agent?.status !== "active") {
        return NextResponse.json(
          { success: false, error: "Agent account is suspended" },
          { status: 403 }
        );
      }

      await supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id);

      return { agentId: key.agent_id };
    }
  }

  return NextResponse.json(
    { success: false, error: "Invalid API key" },
    { status: 401 }
  );
}

export function isAuthError(result: { agentId: string } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
