#!/usr/bin/env node
/**
 * Send outreach emails via Titan SMTP + log to Supabase + open tracking pixel.
 *
 * Usage:
 *   node scripts/send-outreach-emails.mjs --csv "C:/WFT-Institutions/aims-contacts-ap-ts-kr.csv"
 *   node scripts/send-outreach-emails.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

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
const csvArg = args.find((a) => a.startsWith("--csv="))?.slice(6) ??
  (args.includes("--csv") ? args[args.indexOf("--csv") + 1] : null) ??
  "C:/WFT-Institutions/aims-contacts-email-ready.csv";

const SUBJECT = process.env.OUTREACH_SUBJECT ?? "Live Demo — College ERP for Your Institution";
const CAMPAIGN_NAME = process.env.OUTREACH_CAMPAIGN ?? "AIMS AP-TS-KR Outreach";
const DEMO_URL = process.env.DEMO_URL ?? "https://demo.workflowtech.info";
const THROTTLE_MS = Number(process.env.OUTREACH_THROTTLE_MS ?? 4000);

function hubUrl() {
  return (process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3000").replace(/\/$/, "");
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

function buildHtml({ name, institution, recipientId }) {
  const pixel = `${hubUrl()}/api/track/open/${recipientId}`;
  const greeting = name ? `Dear ${name},` : "Dear Sir/Madam,";
  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#111;line-height:1.5;max-width:640px">
<p>${greeting}</p>
<p>We invite you to explore our <strong>live College ERP demo</strong> built for management colleges and institutions.</p>
<p><a href="${DEMO_URL}" style="display:inline-block;background:#1e5eff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open Live Demo</a></p>
<p style="margin-top:16px"><strong>URL:</strong> <a href="${DEMO_URL}">${DEMO_URL}</a><br/>
<strong>Demo login:</strong> admin / Admin@12345</p>
${institution ? `<p style="color:#555;font-size:14px">Institution: ${institution}</p>` : ""}
<p style="margin-top:24px">Regards,<br/><strong>WorkflowTech</strong><br/>College ERP Solutions</p>
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;outline:none;width:1px;height:1px;opacity:0" />
</body></html>`;
}

function buildText({ name, institution }) {
  const greeting = name ? `Dear ${name},` : "Dear Sir/Madam,";
  return `${greeting}

We invite you to explore our live College ERP demo.

URL: ${DEMO_URL}
Demo login: admin / Admin@12345
${institution ? `Institution: ${institution}\n` : ""}
Regards,
WorkflowTech`;
}

async function main() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const smtpHost = process.env.SMTP_HOST ?? "smtp.titan.email";
  const smtpPort = Number(process.env.SMTP_PORT ?? 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromName = process.env.EMAIL_FROM_NAME ?? "WorkflowTech";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? smtpUser;

  if (!sbUrl || !sbKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  if (!dryRun && (!smtpUser || !smtpPass)) throw new Error("Set SMTP_USER and SMTP_PASS (Titan) in .env.local");

  if (!fs.existsSync(csvArg)) throw new Error(`CSV not found: ${csvArg}`);

  const table = parseCsv(fs.readFileSync(csvArg, "utf8"));
  const header = table[0].map((h) => h.toLowerCase());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const instIdx = header.indexOf("institution");
  const stateIdx = header.indexOf("state");
  if (emailIdx < 0) throw new Error("CSV must have Email column");

  const contacts = table.slice(1).filter((r) => r[emailIdx]?.includes("@"));
  const seenEmails = new Set();
  const uniqueContacts = [];
  for (const row of contacts) {
    const email = row[emailIdx].trim().toLowerCase();
    if (seenEmails.has(email)) {
      console.warn(`Skip duplicate in CSV: ${email}`);
      continue;
    }
    seenEmails.add(email);
    uniqueContacts.push(row);
  }
  console.log(`CSV: ${csvArg} — ${uniqueContacts.length} contacts (${contacts.length - uniqueContacts.length} duplicates skipped)`);

  const sb = createClient(sbUrl, sbKey);
  const { data: campaign, error: campErr } = await sb
    .from("email_campaigns")
    .insert({ name: CAMPAIGN_NAME, subject: SUBJECT, from_address: fromAddress })
    .select("id")
    .single();
  if (campErr) throw campErr;

  const transporter = dryRun
    ? null
    : nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

  let sent = 0;
  let failed = 0;

  for (const row of uniqueContacts) {
    const email = row[emailIdx].trim().toLowerCase();
    const name = nameIdx >= 0 ? row[nameIdx]?.trim() : "";
    const institution = instIdx >= 0 ? row[instIdx]?.trim() : "";
    const state = stateIdx >= 0 ? row[stateIdx]?.trim() : "";

    const { data: recipient, error: recErr } = await sb
      .from("email_recipients")
      .insert({
        campaign_id: campaign.id,
        email,
        name: name || null,
        institution: institution || null,
        state: state || null,
        status: "pending"
      })
      .select("id")
      .single();
    if (recErr) {
      console.error(`Skip ${email}:`, recErr.message);
      failed++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Would send to ${email} (${name}) pixel=${hubUrl()}/api/track/open/${recipient.id}`);
      await sb.from("email_recipients").update({ status: "dry-run" }).eq("id", recipient.id);
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: email,
        subject: SUBJECT,
        text: buildText({ name, institution }),
        html: buildHtml({ name, institution, recipientId: recipient.id })
      });
      const now = new Date().toISOString();
      await sb.from("email_recipients").update({ status: "sent", sent_at: now }).eq("id", recipient.id);
      await sb.from("email_events").insert({ recipient_id: recipient.id, kind: "sent" });
      sent++;
      console.log(`Sent ${sent}/${uniqueContacts.length}: ${email}`);
      await sleep(THROTTLE_MS);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("email_recipients").update({ status: "failed", error_message: msg }).eq("id", recipient.id);
      console.error(`Failed ${email}:`, msg);
    }
  }

  console.log(`Done. Campaign ${campaign.id} — sent: ${sent}, failed: ${failed}, dry-run: ${dryRun}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
