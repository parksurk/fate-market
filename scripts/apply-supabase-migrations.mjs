import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const migrations = [
  "migration_001_blockchain.sql",
  "migration_002_phase2_onchain.sql",
  "migration_003_phase3_defi.sql",
  "migration_004_bet_status_tracking.sql",
];

async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    for (const fileName of migrations) {
      const sqlPath = join(process.cwd(), "supabase", fileName);
      const sql = readFileSync(sqlPath, "utf8");
      await client.query(sql);
      console.log(`Applied: ${fileName}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
