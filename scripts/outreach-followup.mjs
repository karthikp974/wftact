/**
 * Follow up email logic (pure code, no Vercel needed).
 */
import nodemailer from "nodemailer";
import {
  FOLLOWUP_SUBJECT_DEMO,
  FOLLOWUP_SUBJECT_NO_DEMO,
  buildFollowUpHtml,
  buildFollowUpText
} from "./email-templates.mjs";

const FOLLOWUP_DELAY_MS = Number(process.env.FOLLOWUP_DELAY_MS ?? 45 * 60 * 1000);
const DEMO_URL = process.env.DEMO_URL ?? "https://demo.workflowtech.info";

function hubUrl() {
  return (process.env.NEXT_PUBLIC_HUB_URL ?? "https://wftact.vercel.app").replace(/\/$/, "");
}

function outreachIdFromMeta(meta) {
  const id = meta?.outreach_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export async function processFollowUps(sb, { dryRun = false, transporter = null, fromName, fromAddress } = {}) {
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
    return { sent: 0, due: 0 };
  }

  const { data: activity } = await sb
    .from("activity_events")
    .select("meta")
    .eq("site_key", "demo");

  const visitedSet = new Set();
  for (const row of activity ?? []) {
    const oid = outreachIdFromMeta(row.meta);
    if (oid) visitedSet.add(oid);
  }

  let sent = 0;
  for (const r of recipients) {
    const visitedDemo = visitedSet.has(r.id);
    const subject = visitedDemo ? FOLLOWUP_SUBJECT_DEMO : FOLLOWUP_SUBJECT_NO_DEMO;
    const html = buildFollowUpHtml({
      name: r.name,
      recipientId: r.id,
      demoUrl: DEMO_URL,
      visitedDemo,
      hubUrl: hubUrl()
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
      console.log(`Follow up sent: ${r.email} (demo visited: ${visitedDemo})`);
    } catch (e) {
      console.error(`Follow up failed ${r.email}:`, e instanceof Error ? e.message : e);
    }
  }

  return { sent, due: recipients.length };
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Keep checking Supabase and send follow ups. Runs on your PC, not Vercel. */
export async function watchFollowUps(sb, smtp) {
  const pollMs = Number(process.env.FOLLOWUP_POLL_MS ?? 5 * 60 * 1000);
  console.log("");
  console.log("Follow up watcher started (runs in this script, not Vercel).");
  console.log(`Checks every ${Math.round(pollMs / 60_000)} min. Sends ${Math.round(FOLLOWUP_DELAY_MS / 60_000)} min after mail open.`);
  console.log("Leave this window open on send day. Ctrl+C to stop.");
  console.log("");

  for (;;) {
    const result = await processFollowUps(sb, smtp);
    if (result.sent > 0) {
      console.log(`Batch done: ${result.sent} follow up(s) sent.`);
    } else {
      const now = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
      console.log(`[${now} IST] No follow ups due yet.`);
    }
    await sleep(pollMs);
  }
}
