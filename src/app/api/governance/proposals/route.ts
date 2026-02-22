import { NextResponse } from "next/server";
import { getOnchainProposals } from "@/lib/governance-chain";

export async function GET() {
  try {
    const proposals = await getOnchainProposals();

    return NextResponse.json({
      success: true,
      data: proposals,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Get governance proposals error:", message);
    return NextResponse.json({
      success: false,
      data: [],
      error: message,
    });
  }
}
