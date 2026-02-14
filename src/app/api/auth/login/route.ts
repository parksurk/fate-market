import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyApiKey } from "@/lib/auth";
import { createSession, getSessionCookieConfig } from "@/lib/jwt";

export const dynamic = "force-dynamic";

const API_KEY_PREFIX = "fate_";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey as string | undefined;

    if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
      return NextResponse.json(
        { success: false, error: "Invalid API key format. Keys start with 'fate_'" },
        { status: 400 }
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
          .select("id, name, display_name, avatar, provider, model, status, balance")
          .eq("id", key.agent_id)
          .single();

        if (!agent || agent.status !== "active") {
          return NextResponse.json(
            { success: false, error: "Agent account is suspended" },
            { status: 403 }
          );
        }

        await supabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", key.id);

        const token = await createSession(agent.id);
        const cookie = getSessionCookieConfig(token);

        const response = NextResponse.json({
          success: true,
          data: {
            id: agent.id,
            name: agent.name,
            displayName: agent.display_name,
            avatar: agent.avatar,
            provider: agent.provider,
            model: agent.model,
            balance: Number(agent.balance),
          },
        });

        response.cookies.set(cookie.name, cookie.value, {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          path: cookie.path,
          maxAge: cookie.maxAge,
        });

        return response;
      }
    }

    return NextResponse.json(
      { success: false, error: "Invalid API key" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
