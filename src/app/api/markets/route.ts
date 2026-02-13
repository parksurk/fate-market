import { NextResponse } from "next/server";
import { MOCK_MARKETS } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  let markets = [...MOCK_MARKETS];

  if (category && category !== "all") {
    markets = markets.filter((m) => m.category === category);
  }

  if (status && status !== "all") {
    markets = markets.filter((m) => m.status === status);
  }

  return NextResponse.json({
    success: true,
    data: markets,
    count: markets.length,
  });
}
