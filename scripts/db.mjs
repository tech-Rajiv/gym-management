/**
 * Database management script.
 *
 *   npm run db:setup       create tables, indexes and the member_overview view
 *   npm run db:seed        insert demo plans and members
 *   npm run db:seed:clear  remove only the demo members (plans are kept)
 *   npm run db:reset       drop everything, then set up and seed from scratch
 *
 * Run outside Next.js, so it reads .env itself.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env reader - avoids pulling in dotenv just for this script. */
function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const file = readFileSync(join(projectRoot, ".env"), "utf8");
    for (const line of file.split("\n")) {
      const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const value = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    // No .env file - fall through to the error below.
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env and try again.");
    process.exit(1);
  }
  return process.env.DATABASE_URL;
}

const sql = neon(loadEnv());

/**
 * Runs a .sql file.
 *
 * Statements are split on semicolons at the end of a line, which is enough for
 * these files. The one construct that would break it - the $$ ... $$ body of
 * the trigger function - is protected by tracking whether we are inside a
 * dollar-quoted block.
 */
async function runSqlFile(fileName) {
  const contents = readFileSync(join(projectRoot, "database", fileName), "utf8");

  const statements = [];
  let current = "";
  let inDollarQuote = false;

  for (const line of contents.split("\n")) {
    if (line.includes("$$")) {
      // An even number of $$ markers on one line opens and closes again.
      const markers = line.split("$$").length - 1;
      if (markers % 2 === 1) inDollarQuote = !inDollarQuote;
    }
    current += line + "\n";
    if (!inDollarQuote && line.trim().endsWith(";")) {
      const statement = current.trim();
      // Skip chunks that are only comments.
      if (statement.replace(/--.*$/gm, "").trim().length > 1) {
        statements.push(statement);
      }
      current = "";
    }
  }

  for (const statement of statements) {
    await sql.query(statement);
  }
  return statements.length;
}

const commands = {
  async setup() {
    const count = await runSqlFile("schema.sql");
    console.log(`Schema applied (${count} statements).`);
  },

  async seed() {
    const count = await runSqlFile("seed.sql");
    const [{ members, plans }] = await sql`
      SELECT
        (SELECT count(*) FROM members)::int          AS members,
        (SELECT count(*) FROM membership_plans)::int AS plans
    `;
    console.log(`Seed applied (${count} statements).`);
    console.log(`Database now holds ${plans} plans and ${members} members.`);
  },

  async "seed:clear"() {
    // Memberships are removed automatically by ON DELETE CASCADE.
    const removed = await sql`DELETE FROM members WHERE is_demo = true RETURNING id`;
    console.log(`Removed ${removed.length} demo members and their memberships.`);
    console.log("Membership plans were kept - delete them by hand if unwanted.");
  },

  async reset() {
    await sql`DROP VIEW IF EXISTS payment_overview`;
    await sql`DROP VIEW IF EXISTS member_overview`;
    await sql`DROP TABLE IF EXISTS payments`;
    await sql`DROP TABLE IF EXISTS memberships`;
    await sql`DROP TABLE IF EXISTS members`;
    await sql`DROP TABLE IF EXISTS membership_plans`;
    await sql`DROP FUNCTION IF EXISTS set_updated_at`;
    console.log("Dropped existing tables.");
    await commands.setup();
    await commands.seed();
  },
};

const command = process.argv[2];

if (!command || !commands[command]) {
  console.error(`Unknown command: ${command ?? "(none)"}`);
  console.error(`Available: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

try {
  await commands[command]();
} catch (error) {
  console.error(`\nFailed to run "${command}":`);
  console.error(error.message ?? error);
  process.exit(1);
}
