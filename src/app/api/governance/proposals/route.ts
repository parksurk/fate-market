import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const client = createServiceClient();
    const { data: proposals, error } = await client
      .from("governance_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch proposals:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch proposals" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: proposals || [],
    });
  } catch (err) {
    console.error("Get governance proposals error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch governance proposals" },
      { status: 500 }
    );
  }
}
