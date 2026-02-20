import { NextResponse } from "next/server";
import { getGovernorSettings } from "@/lib/governance-chain";

export async function GET(request: Request) {
  try {
    const settings = await getGovernorSettings();

    return NextResponse.json({
      success: true,
      data: {
        votingDelay: settings.votingDelay,
        votingPeriod: settings.votingPeriod,
        proposalThreshold: settings.proposalThreshold,
      },
    });
  } catch (err) {
    console.error("Get governance settings error:", err);
    return NextResponse.json(
      {
        success: true,
        data: {
          votingDelay: "1",
          votingPeriod: "50400",
          proposalThreshold: "1000000000000000000",
        },
      },
      { status: 200 }
    );
  }
}
