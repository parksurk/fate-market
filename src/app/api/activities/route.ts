import { NextResponse } from "next/server";
import { getActivities, getActivitiesByMarket } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("marketId");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    if (marketId) {
      const activities = await getActivitiesByMarket(marketId);
      return NextResponse.json({
        success: true,
        data: activities,
        count: activities.length,
      });
    }

    const activities = await getActivities(limit);
    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
