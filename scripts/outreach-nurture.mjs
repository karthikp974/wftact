/**
 * Nurture drip when follow up mail was sent but not opened.
 * Step 1: 45 min after follow up
 * Step 2: 2.5 hr after step 1
 * Step 3: 5 hr after step 2
 * Step 4+: every 2 days until 20 days from first outreach send
 */
import { buildNurtureHtml, buildNurtureText, nurtureSubject } from "./email-templates.mjs";

const NURTURE_STEP_DELAYS_MS = [
  45 * 60 * 1000,
  2.5 * 60 * 60 * 1000,
  5 * 60 * 60 * 1000
];
const NURTURE_ALTERNATE_DAY_MS = 2 * 24 * 60 * 60 * 1000;
const NURTURE_CAMPAIGN_DAYS = Number(process.env.NURTURE_CAMPAIGN_DAYS ?? 20);
const DEMO_URL = process.env.DEMO_URL ?? "https://demo.workflowtech.info";

function hubUrl() {
  return (process.env.NEXT_PUBLIC_HUB_URL ?? "https://wftact.vercel.app").replace(/\/$/, "");
}

function nurtureDueAt(recipient, nowMs = Date.now()) {
  if (!recipient.follow_up_sent_at || !recipient.sent_at) return null;
  if ((recipient.follow_up_open_count ?? 0) > 0) return null;
  if ((recipient.nurture_open_count ?? 0) > 0) return null;

  const campaignEnd = new Date(recipient.sent_at).getTime() + NURTURE_CAMPAIGN_DAYS * 24 * 60 * 60 * 1000;
  if (nowMs > campaignEnd) return null;

  const step = recipient.nurture_step ?? 0;
  if (step === 0) {
    return new Date(recipient.follow_up_sent_at).getTime() + NURTURE_STEP_DELAYS_MS[0];
  }
  if (!recipient.last_nurture_sent_at) return null;

  const last = new Date(recipient.last_nurture_sent_at).getTime();
  if (step === 1) return last + NURTURE_STEP_DELAYS_MS[1];
  if (step === 2) return last + NURTURE_STEP_DELAYS_MS[2];
  return last + NURTURE_ALTERNATE_DAY_MS;
}

export function nextNurtureStep(recipient, nowMs = Date.now()) {
  const due = nurtureDueAt(recipient, nowMs);
  if (due == null || nowMs < due) return null;
  return (recipient.nurture_step ?? 0) + 1;
}

export async function processNurture(sb, { dryRun = false, transporter = null, fromName, fromAddress } = {}) {
  const { data: recipients, error } = await sb
    .from("email_recipients")
    .select("*")
    .eq("status", "sent")
    .not("follow_up_sent_at", "is", null)
    .eq("follow_up_open_count", 0)
    .eq("nurture_open_count", 0);

  if (error) throw error;

  const nowMs = Date.now();
  let sent = 0;

  for (const r of recipients ?? []) {
    const step = nextNurtureStep(r, nowMs);
    if (!step) continue;

    const subject = nurtureSubject(step);
    const html = buildNurtureHtml({
      name: r.name,
      recipientId: r.id,
      demoUrl: DEMO_URL,
      hubUrl: hubUrl(),
      step
    });
    const text = buildNurtureText({
      name: r.name,
      recipientId: r.id,
      demoUrl: DEMO_URL,
      step
    });

    if (dryRun) {
      console.log(`[dry-run] nurture step ${step} → ${r.email}`);
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
      await sb
        .from("email_recipients")
        .update({ nurture_step: step, last_nurture_sent_at: now })
        .eq("id", r.id);
      await sb.from("email_events").insert({ recipient_id: r.id, kind: "nurture" });
      sent++;
      console.log(`Nurture step ${step} sent: ${r.email}`);
    } catch (e) {
      console.error(`Nurture failed ${r.email}:`, e instanceof Error ? e.message : e);
    }
  }

  return { sent, candidates: recipients?.length ?? 0 };
}
