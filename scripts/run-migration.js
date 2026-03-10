const pg = require("pg");
const fs = require("fs");
require("dotenv").config();

async function run() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Run migration 0001
  const sql1 = fs.readFileSync("migrations/0001_flipagent_tables.sql", "utf-8");
  console.log("Running 0001_flipagent_tables.sql...");
  await client.query(sql1);
  console.log("0001 done.");

  // Verify tables were created
  const res = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name IN ('sellers','products','listings','integrations','ai_generations','sync_queue')
     ORDER BY table_name`
  );
  console.log("Created tables:", res.rows.map((r) => r.table_name).join(", "));

  await client.end();
}

run().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
