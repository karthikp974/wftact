#!/usr/bin/env node
/**
 * Send follow up emails 45 minutes after first open.
 *
 *   node scripts/send-followup-emails.mjs          # run once now
 *   node scripts/send-followup-emails.mjs --watch  # keep watching (no Vercel)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { processFollowUps, watchFollowUps } from "./outreach-followup.mjs";
import { processNurture } from "./outreach-nurture.mjs";
import { checkInboxReplies } from "./check-inbox-replies.mjs";
import { createMailSender, mailConfigured, mailFromDefaults, mailProvider } from "./mail-send.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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

const dryRun = process.argv.includes("--dry-run");
const watch = process.argv.includes("--watch");

async function main() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { fromName, fromAddress } = mailFromDefaults();

  if (!sbUrl || !sbKey) throw new Error("Missing Supabase env");
  if (!dryRun && !mailConfigured()) throw new Error("Set SENDER_API_KEY or SMTP_USER + SMTP_PASS");

  const sb = createClient(sbUrl, sbKey);
  if (!dryRun) console.log(`Mail provider: ${mailProvider()}`);
  const smtp = {
    dryRun,
    transporter: dryRun ? null : createMailSender(),
    fromName,
    fromAddress
  };

  if (watch) {
    await watchFollowUps(sb, smtp);
    return;
  }

  const result = await processFollowUps(sb, smtp);
  const nurture = await processNurture(sb, smtp);
  const replies = await checkInboxReplies(sb).catch((e) => {
    console.error("Inbox check skipped:", e instanceof Error ? e.message : e);
    return { paused: 0 };
  });
  const parts = [];
  if (result.sent) parts.push(`Follow ups sent: ${result.sent}`);
  if (nurture.sent) parts.push(`Nurture sent: ${nurture.sent}`);
  if (replies.paused) parts.push(`Paused (reply): ${replies.paused}`);
  console.log(parts.length ? parts.join(" · ") : "No follow ups or nurture due");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
