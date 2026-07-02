import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(ROOT, ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  let val = t.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[t.slice(0, i).trim()] = val;
}

const emails = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["nukalapavankarthik@gmail.com", "karthikpnukala@gmail.com"];

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: recipients, error } = await sb
  .from("email_recipients")
  .select("*")
  .in("email", emails)
  .order("sent_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const { data: activity } = await sb
  .from("activity_events")
  .select("meta, kind, path, created_at")
  .eq("site_key", "demo");

console.log("=== MAIL OPEN STATUS ===\n");
for (const r of recipients ?? []) {
  const opened = !!(r.opened_at || (r.open_count ?? 0) > 0);
  const visits = (activity ?? []).filter((a) => a.meta?.outreach_id === r.id);
  console.log(`Email: ${r.email}`);
  console.log(`  Opened mail: ${opened ? "YES" : "NO"}`);
  console.log(`  Opens: ${r.open_count ?? 0}`);
  console.log(`  First open: ${r.opened_at ?? "never"}`);
  console.log(`  Demo visited: ${visits.length > 0 ? "YES" : "NO"}`);
  console.log(`  Follow up sent: ${r.follow_up_sent_at ? "YES" : "NO"}`);
  console.log("");
}
