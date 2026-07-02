#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function outreachIdFromMeta(meta) {
  const id = meta?.outreach_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

const { data: activity } = await sb.from("activity_events").select("meta").eq("site_key", "demo");
const visitedSet = new Set();
for (const row of activity ?? []) {
  const oid = outreachIdFromMeta(row.meta);
  if (oid) visitedSet.add(oid);
}

const { data: recipients, error } = await sb
  .from("email_recipients")
  .select("id,email,follow_up_sent_at,follow_up_type")
  .not("follow_up_sent_at", "is", null)
  .is("follow_up_type", null);

if (error) throw error;

for (const r of recipients ?? []) {
  const type = visitedSet.has(r.id) ? "visited_demo" : "no_demo";
  await sb.from("email_recipients").update({ follow_up_type: type }).eq("id", r.id);
  console.log(`${r.email} → ${type}`);
}

console.log("Backfill done.");
