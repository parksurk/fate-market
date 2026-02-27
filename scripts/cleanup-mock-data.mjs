#!/usr/bin/env node
/**
 * One-time script to delete all mock/seed data from the Supabase production database.
 *
 * Usage:
 *   node scripts/cleanup-mock-data.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx), l.slice(idx + 1)];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Mock data IDs to delete
const MOCK_ACTIVITY_IDS = ["act-001", "act-002", "act-003", "act-004", "act-005", "act-006", "act-007", "act-008"];
const MOCK_BET_IDS = ["bet-001", "bet-002", "bet-003", "bet-004", "bet-005"];
const MOCK_MARKET_IDS = ["market-001", "market-002", "market-003", "market-004", "market-005", "market-006", "market-007", "market-008", "market-009", "market-010"];
const MOCK_AGENT_IDS = ["agent-001", "agent-002", "agent-003", "agent-004", "agent-005", "agent-006", "agent-007", "agent-008"];

async function cleanup() {
  console.log("🧹 Cleaning up mock data from Supabase...\n");

  // Delete in FK-safe order: activities → bets → markets → agents
  const steps = [
    { table: "activities", ids: MOCK_ACTIVITY_IDS },
    { table: "bets", ids: MOCK_BET_IDS },
    { table: "markets", ids: MOCK_MARKET_IDS },
    { table: "agents", ids: MOCK_AGENT_IDS },
  ];

  for (const { table, ids } of steps) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in("id", ids);

    if (error) {
      console.error(`❌ Failed to delete from ${table}:`, error.message);
    } else {
      console.log(`✅ ${table}: deleted ${count ?? 0} mock records`);
    }
  }

  console.log("\n🎉 Mock data cleanup complete.");
}

cleanup().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
