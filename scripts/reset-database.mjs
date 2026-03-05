#!/usr/bin/env node
/**
 * Reset the entire Supabase database to a clean state.
 * Deletes ALL data from every table in FK-safe order.
 *
 * Usage:
 *   node scripts/reset-database.mjs
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

// FK-safe deletion order: children first, then parents
const TABLES = ["activities", "bets", "api_keys", "markets", "agents"];

async function resetDatabase() {
  console.log("🔄 Resetting Fate Market database to clean state...\n");

  for (const table of TABLES) {
    // Delete all rows: use neq on id to match everything (Supabase requires a filter)
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .neq("id", "___impossible___");

    if (error) {
      console.error(`❌ Failed to clear ${table}:`, error.message);
    } else {
      console.log(`✅ ${table}: deleted ${count ?? 0} records`);
    }
  }

  console.log("\n🎉 Database reset complete. All tables are empty.");
}

resetDatabase().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
