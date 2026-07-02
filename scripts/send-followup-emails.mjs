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
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { processFollowUps, watchFollowUps } from "./outreach-followup.mjs";

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
  const smtpHost = process.env.SMTP_HOST ?? "smtp.titan.email";
  const smtpPort = Number(process.env.SMTP_PORT ?? 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromName = process.env.EMAIL_FROM_NAME ?? "WorkflowTech";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? smtpUser;

  if (!sbUrl || !sbKey) throw new Error("Missing Supabase env");
  if (!dryRun && (!smtpUser || !smtpPass)) throw new Error("Missing SMTP env");

  const sb = createClient(sbUrl, sbKey);
  const smtp = {
    dryRun,
    transporter: dryRun
      ? null
      : nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        }),
    fromName,
    fromAddress
  };

  if (watch) {
    await watchFollowUps(sb, smtp);
    return;
  }

  const result = await processFollowUps(sb, smtp);
  console.log(result.sent ? `Follow ups sent: ${result.sent}` : "No follow ups due");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
