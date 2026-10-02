/**
 * The daily report's schedule, on Upstash QStash.
 *
 *   npm run report:schedule            create (or update) the 6 AM schedule
 *   npm run report:schedule -- status  show the schedule as QStash has it
 *   npm run report:schedule -- delete  stop the daily email
 *
 * QStash calls ${APP_URL}/api/cron/daily-report every day at 6:00 AM India
 * time. That URL must be reachable from the internet, so APP_URL is the
 * deployed site (e.g. https://aura-fitness.vercel.app), never localhost.
 *
 * India has no daylight saving, so 6:00 AM IST is always 00:30 UTC - the
 * cron below is written in UTC, which is what QStash runs on.
 *
 * Creating with a fixed scheduleId updates the one schedule rather than
 * adding another, so running this again (after a new deploy URL, say) is safe.
 *
 * Run outside Next.js, so it reads .env itself.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@upstash/qstash";

const SCHEDULE_ID = "aura-daily-report";
const CRON_6AM_IST = "30 0 * * *"; // 00:30 UTC = 06:00 IST

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env reader - the same one scripts/db.mjs uses. */
function loadEnv() {
  try {
    const file = readFileSync(join(projectRoot, ".env"), "utf8");
    for (const line of file.split("\n")) {
      const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const value = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    // No .env file - the checks below explain what is missing.
  }
}

function require(name) {
  if (!process.env[name]) {
    console.error(`${name} is not set. Add it to .env and try again.`);
    process.exit(1);
  }
  return process.env[name];
}

loadEnv();
const client = new Client({
  token: require("QSTASH_TOKEN"),
  baseUrl: process.env.QSTASH_URL || undefined,
});

const commands = {
  async create() {
    const appUrl = require("APP_URL").replace(/\/$/, "");
    if (/localhost|127\.0\.0\.1/.test(appUrl)) {
      console.error(
        "APP_URL points at this computer, which QStash cannot reach. " +
          "Set it to the deployed site, e.g. https://your-app.vercel.app"
      );
      process.exit(1);
    }

    const destination = `${appUrl}/api/cron/daily-report`;
    await client.schedules.create({
      scheduleId: SCHEDULE_ID,
      destination,
      cron: CRON_6AM_IST,
      method: "POST",
      retries: 3,
    });
    console.log("Daily report scheduled.");
    console.log(`  Every day at 6:00 AM India time (cron "${CRON_6AM_IST}" UTC)`);
    console.log(`  Calls ${destination}`);
  },

  async status() {
    try {
      const schedule = await client.schedules.get(SCHEDULE_ID);
      console.log(`Schedule "${SCHEDULE_ID}":`);
      console.log(`  cron:        ${schedule.cron} (UTC)`);
      console.log(`  destination: ${schedule.destination}`);
      console.log(`  paused:      ${schedule.isPaused ? "yes" : "no"}`);
    } catch (error) {
      console.log(`No schedule "${SCHEDULE_ID}" yet - run: npm run report:schedule`);
      if (process.env.DEBUG) console.error(error);
    }
  },

  async delete() {
    await client.schedules.delete(SCHEDULE_ID);
    console.log("Daily report schedule deleted. No more morning emails.");
  },
};

const command = process.argv[2] ?? "create";
if (!commands[command]) {
  console.error(`Unknown command: ${command}. Use create, status or delete.`);
  process.exit(1);
}

try {
  await commands[command]();
} catch (error) {
  console.error(`Failed to ${command} the schedule:`, error?.message ?? error);
  process.exit(1);
}
