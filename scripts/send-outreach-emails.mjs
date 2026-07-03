#!/usr/bin/env node
/**
 * Send outreach emails via Brevo SMTP + open tracking + personalized demo links.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import {
  OUTREACH_SUBJECT,
  buildOutreachHtml,
  buildOutreachText
} from "./email-templates.mjs";
import { createSmtpTransport, mailFromAddress, smtpConfigured } from "./smtp-config.mjs";

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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const watchFollowups = args.includes("--watch-followups");
const testEmail = args.find((a) => a.startsWith("--test="))?.slice(7) ??
  (args.includes("--test") ? args[args.indexOf("--test") + 1] : null);
const csvArg =
  args.find((a) => a.startsWith("--csv="))?.slice(6) ??
  (args.includes("--csv") ? args[args.indexOf("--csv") + 1] : null) ??
  path.join(ROOT, "data", "aims-contacts-email-ready.csv");
const limitArg = args.find((a) => a.startsWith("--limit="))?.slice(8) ??
  (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : null);
const LIMIT = limitArg ? Number(limitArg) : null;
const skipSent = args.includes("--skip-sent");

const CAMPAIGN_NAME = process.env.OUTREACH_CAMPAIGN ?? "AIMS India Outreach";
const DEMO_URL = process.env.DEMO_URL ?? "https://demo.workflowtech.info";
const THROTTLE_MS = Number(process.env.OUTREACH_THROTTLE_MS ?? 3000);

function hubUrl() {
  return (process.env.NEXT_PUBLIC_HUB_URL ?? "https://wftact.vercel.app").replace(/\/$/, "");
}

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((x) => x.trim())) rows.push(row);
  }
  return rows;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait until Titan quota resets (hourly/daily) then retry same contact. */
function quotaWaitMs(message) {
  const msg = String(message);
  const untilMatch = msg.match(/until (\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/i);
  if (untilMatch) {
    const raw = untilMatch[1].replace(" ", "T");
    const resetAt = new Date(msg.includes("UTC") ? `${raw}Z` : raw);
    if (!Number.isNaN(resetAt.getTime())) {
      return Math.max(0, resetAt.getTime() - Date.now()) + 60_000;
    }
  }
  if (/Hourly Quota/i.test(msg)) return 65 * 60 * 1000;
  if (/Daily Quota/i.test(msg)) return 25 * 60 * 60 * 1000;
  return 0;
}

async function sendOne({ sb, transporter, fromName, fromAddress, row, header, campaignId, dryRunMode }) {
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const instIdx = header.indexOf("institution");
  const stateIdx = header.indexOf("state");
  const phoneIdx = header.indexOf("mobile");

  const email = row[emailIdx].trim().toLowerCase();
  const name = nameIdx >= 0 ? row[nameIdx]?.trim() : "";
  const institution = instIdx >= 0 ? row[instIdx]?.trim() : "";
  const state = stateIdx >= 0 ? row[stateIdx]?.trim() : "";
  const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : "";

  const { data: recipient, error: recErr } = await sb
    .from("email_recipients")
    .insert({
      campaign_id: campaignId,
      email,
      name: name || null,
      institution: institution || null,
      state: state || null,
      phone: phone || null,
      status: "pending"
    })
    .select("id")
    .single();
  if (recErr) throw recErr;

  const html = buildOutreachHtml({
    name,
    recipientId: recipient.id,
    demoUrl: DEMO_URL,
    hubUrl: hubUrl()
  });
  const text = buildOutreachText({ name, recipientId: recipient.id, demoUrl: DEMO_URL });

  if (dryRunMode) {
    console.log(`[dry-run] ${email} | ${name} | ${institution} | pixel=${hubUrl()}/api/track/open/${recipient.id}`);
    await sb.from("email_recipients").update({ status: "dry-run" }).eq("id", recipient.id);
    return { ok: true };
  }

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: email,
    subject: OUTREACH_SUBJECT,
    text,
    html
  });
  const now = new Date().toISOString();
  await sb.from("email_recipients").update({ status: "sent", sent_at: now }).eq("id", recipient.id);
  await sb.from("email_events").insert({ recipient_id: recipient.id, kind: "sent" });
  return { ok: true };
}

async function main() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fromName = process.env.EMAIL_FROM_NAME ?? "WorkflowTech";
  const fromAddress = mailFromAddress();

  if (!sbUrl || !sbKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  if (!dryRun && !testEmail && !smtpConfigured()) {
    throw new Error("Set SMTP_USER + SMTP_PASS (or BREVO_API_KEY) for Brevo SMTP");
  }

  const sb = createClient(sbUrl, sbKey);

  if (testEmail) {
    const { data: campaign, error: campErr } = await sb
      .from("email_campaigns")
      .insert({ name: "Test send", subject: OUTREACH_SUBJECT, from_address: fromAddress })
      .select("id")
      .single();
    if (campErr) throw campErr;

    const transporter = createSmtpTransport(nodemailer);

    await sendOne({
      sb,
      transporter,
      fromName,
      fromAddress,
      row: ["Test User", testEmail, "Test Institution", "9999999999"],
      header: ["name", "email", "institution", "mobile"],
      campaignId: campaign.id,
      dryRunMode: false
    });
    console.log(`Test email sent to ${testEmail}`);
    return;
  }

  if (!fs.existsSync(csvArg)) throw new Error(`CSV not found: ${csvArg}`);

  const table = parseCsv(fs.readFileSync(csvArg, "utf8"));
  const header = table[0].map((h) => h.toLowerCase());
  const emailIdx = header.indexOf("email");
  if (emailIdx < 0) throw new Error("CSV must have Email column");

  const contacts = table.slice(1).filter((r) => r[emailIdx]?.includes("@"));
  const seenEmails = new Set();
  let uniqueContacts = [];
  for (const row of contacts) {
    const email = row[emailIdx].trim().toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    uniqueContacts.push(row);
  }

  if (skipSent) {
    const { data: alreadySent, error: skipErr } = await sb
      .from("email_recipients")
      .select("email")
      .eq("status", "sent");
    if (skipErr) throw skipErr;
    const sentSet = new Set((alreadySent ?? []).map((r) => r.email.toLowerCase()));
    const before = uniqueContacts.length;
    uniqueContacts = uniqueContacts.filter((r) => !sentSet.has(r[emailIdx].trim().toLowerCase()));
    console.log(`Skip sent: ${before - uniqueContacts.length} already sent, ${uniqueContacts.length} remaining`);
  }

  if (LIMIT != null && LIMIT > 0) {
    uniqueContacts = uniqueContacts.slice(0, LIMIT);
    console.log(`Limit: sending ${uniqueContacts.length} contact(s) this run`);
  }

  console.log(`CSV: ${uniqueContacts.length} contacts to send (one by one, ${THROTTLE_MS / 1000}s apart)`);

  const { data: campaign, error: campErr } = await sb
    .from("email_campaigns")
    .insert({ name: CAMPAIGN_NAME, subject: OUTREACH_SUBJECT, from_address: fromAddress })
    .select("id")
    .single();
  if (campErr) throw campErr;

  const transporter = dryRun ? null : createSmtpTransport(nodemailer);

  let sent = 0;
  let failed = 0;

  for (const row of uniqueContacts) {
    let done = false;
    while (!done) {
      try {
        await sendOne({
          sb,
          transporter,
          fromName,
          fromAddress,
          row,
          header,
          campaignId: campaign.id,
          dryRunMode: dryRun
        });
        sent++;
        done = true;
        if (!dryRun) {
          console.log(`Sent ${sent}/${uniqueContacts.length}: ${row[emailIdx]} — next in ${THROTTLE_MS / 1000}s`);
          if (sent < uniqueContacts.length) await sleep(THROTTLE_MS);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const waitMs = dryRun ? 0 : quotaWaitMs(message);
        if (waitMs > 0) {
          const mins = Math.ceil(waitMs / 60_000);
          console.warn(`Quota limit — waiting ${mins} min before retry: ${row[emailIdx]}`);
          await sleep(waitMs);
          continue;
        }
        failed++;
        console.error(`Failed ${row[emailIdx]}:`, message);
        done = true;
      }
    }
  }

  console.log(`Done. sent: ${sent}, failed: ${failed}, dry-run: ${dryRun}`);

  if (watchFollowups && !dryRun) {
    const { watchFollowUps } = await import("./outreach-followup.mjs");
    const smtp = {
      dryRun: false,
      transporter: createSmtpTransport(nodemailer),
      fromName,
      fromAddress
    };
    await watchFollowUps(sb, smtp);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
