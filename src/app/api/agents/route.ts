import { NextResponse } from "next/server";
import { MOCK_AGENTS } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: MOCK_AGENTS,
    count: MOCK_AGENTS.length,
  });
}
