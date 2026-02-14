import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/jwt";
import { getAgentById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const agent = await getAgentById(session.agentId);
    if (!agent || agent.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Agent not found or suspended" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        displayName: agent.displayName,
        avatar: agent.avatar,
        provider: agent.provider,
        model: agent.model,
        balance: agent.balance,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to get session" },
      { status: 500 }
    );
  }
}
