#!/usr/bin/env node
/**
 * Apply supabase/schema.sql to the linked Supabase project.
 *
 * Option A — Supabase personal access token (recommended):
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/apply-schema.mjs
 *
 * Option B — Supabase CLI already logged in:
 *   npx supabase link --project-ref gtooxwzvybsgwkzhlfgb
 *   npx supabase db query -f supabase/schema.sql --linked
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "gtooxwzvybsgwkzhlfgb";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\n" +
      "Get one: https://supabase.com/dashboard/account/tokens\n" +
      "Then: $env:SUPABASE_ACCESS_TOKEN='sbp_...'; node scripts/apply-schema.mjs"
  );
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, "utf8");
const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const body = await res.text();
if (!res.ok) {
  console.error(`Schema apply failed (${res.status}):`, body);
  process.exit(1);
}

console.log("Schema applied successfully.");
try {
  const parsed = JSON.parse(body);
  if (Array.isArray(parsed) && parsed.length === 0) {
    console.log("Tables: sites, activity_events, email_campaigns, email_recipients, email_events");
  }
} catch {
  console.log(body.slice(0, 200));
}
