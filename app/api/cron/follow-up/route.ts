import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  FOLLOWUP_SUBJECT_DEMO,
  FOLLOWUP_SUBJECT_NO_DEMO,
  buildFollowUpHtml,
  buildFollowUpText
} from "@/lib/outreach-email";
import { getSupabaseAdmin } from "@/lib/supabase";

const FOLLOWUP_DELAY_MS = Number(process.env.FOLLOWUP_DELAY_MS ?? 45 * 60 * 1000);
const DEMO_URL = process.env.DEMO_URL ?? "https://demo.workflowtech.info";

function outreachIdFromMeta(meta: Record<string, unknown> | null | undefined) {
  const id = meta?.outreach_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function runFollowUps() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return { error: "SMTP not configured", status: 500 as const };
  }

  const sb = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - FOLLOWUP_DELAY_MS).toISOString();

  const { data: recipients, error } = await sb
    .from("email_recipients")
    .select("*")
    .eq("status", "sent")
    .not("opened_at", "is", null)
    .is("follow_up_sent_at", null)
    .lte("opened_at", cutoff);

  if (error) return { error: error.message, status: 500 as const };
  if (!recipients?.length) {
    return { body: { sent: 0, message: "No follow ups due" }, status: 200 as const };
  }

  const { data: activity } = await sb
    .from("activity_events")
    .select("meta")
    .eq("site_key", "demo");

  const visitedSet = new Set<string>();
  for (const row of activity ?? []) {
    const oid = outreachIdFromMeta(row.meta as Record<string, unknown>);
    if (oid) visitedSet.add(oid);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.titan.email",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const fromName = process.env.EMAIL_FROM_NAME ?? "WorkflowTech";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? smtpUser;
  let sent = 0;

  for (const r of recipients) {
    const visitedDemo = visitedSet.has(r.id);
    const subject = visitedDemo ? FOLLOWUP_SUBJECT_DEMO : FOLLOWUP_SUBJECT_NO_DEMO;
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: r.email,
        subject,
        text: buildFollowUpText({
          name: r.name,
          recipientId: r.id,
          demoUrl: DEMO_URL,
          visitedDemo
        }),
        html: buildFollowUpHtml({
          name: r.name,
          recipientId: r.id,
          demoUrl: DEMO_URL,
          visitedDemo
        })
      });
      const now = new Date().toISOString();
      await sb.from("email_recipients").update({ follow_up_sent_at: now }).eq("id", r.id);
      await sb.from("email_events").insert({ recipient_id: r.id, kind: "follow_up" });
      sent++;
    } catch {
      // continue
    }
  }

  return { body: { sent, due: recipients.length }, status: 200 as const };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFollowUps();
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body);
}
