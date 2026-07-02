#!/usr/bin/env node
/**
 * Send follow up emails 45 minutes after first open (run via cron or manually).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import {
  FOLLOWUP_SUBJECT_DEMO,
  FOLLOWUP_SUBJECT_NO_DEMO,
  buildFollowUpHtml,
  buildFollowUpText
} from "./email-templates.mjs";

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

const FOLLOWUP_DELAY_MS = Number(process.env.FOLLOWUP_DELAY_MS ?? 45 * 60 * 1000);
const DEMO_URL = process.env.DEMO_URL ?? "https://demo.workflowtech.info";
const dryRun = process.argv.includes("--dry-run");

function outreachIdFromMeta(meta) {
  const id = meta?.outreach_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
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

  if (!sbUrl || !sbKey) throw new Error("Missing Supabase env");
  if (!dryRun && (!smtpUser || !smtpPass)) throw new Error("Missing SMTP env");

  const sb = createClient(sbUrl, sbKey);
  const cutoff = new Date(Date.now() - FOLLOWUP_DELAY_MS).toISOString();

  const { data: recipients, error } = await sb
    .from("email_recipients")
    .select("*")
    .eq("status", "sent")
    .not("opened_at", "is", null)
    .is("follow_up_sent_at", null)
    .lte("opened_at", cutoff);

  if (error) throw error;
  if (!recipients?.length) {
    console.log("No follow ups due");
    return;
  }

  const { data: activity } = await sb
    .from("activity_events")
    .select("kind, path, meta, created_at")
    .eq("site_key", "demo");

  const visitedSet = new Set();
  for (const row of activity ?? []) {
    const oid = outreachIdFromMeta(row.meta);
    if (oid) visitedSet.add(oid);
  }

  const transporter = dryRun
    ? null
    : nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

  let sent = 0;
  for (const r of recipients) {
    const visitedDemo = visitedSet.has(r.id);
    const subject = visitedDemo ? FOLLOWUP_SUBJECT_DEMO : FOLLOWUP_SUBJECT_NO_DEMO;
    const html = buildFollowUpHtml({
      name: r.name,
      recipientId: r.id,
      demoUrl: DEMO_URL,
      visitedDemo
    });
    const text = buildFollowUpText({
      name: r.name,
      recipientId: r.id,
      demoUrl: DEMO_URL,
      visitedDemo
    });

    if (dryRun) {
      console.log(`[dry-run] follow up → ${r.email} visitedDemo=${visitedDemo}`);
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: r.email,
        subject,
        text,
        html
      });
      const now = new Date().toISOString();
      await sb.from("email_recipients").update({ follow_up_sent_at: now }).eq("id", r.id);
      await sb.from("email_events").insert({ recipient_id: r.id, kind: "follow_up" });
      sent++;
      console.log(`Follow up sent: ${r.email} (demo: ${visitedDemo})`);
    } catch (e) {
      console.error(`Follow up failed ${r.email}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Follow ups sent: ${sent}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
