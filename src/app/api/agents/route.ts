import { NextResponse } from "next/server";
import { getAgents, getAgentById } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const agent = await getAgentById(id);
      if (!agent) {
        return NextResponse.json(
          { success: false, error: "Agent not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: agent });
    }

    const agents = await getAgents();
    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
