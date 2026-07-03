/**
 * Pause outreach when someone replies to karthik@workflowtech.info
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPLY_TO = (process.env.REPLY_WATCH_ADDRESS ?? "karthik@workflowtech.info").toLowerCase();

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

function emailFromAddress(raw) {
  if (!raw) return null;
  const m = String(raw).match(/[\w.+-]+@[\w.-]+\.\w+/);
  return m ? m[0].toLowerCase() : null;
}

export async function checkInboxReplies(sb) {
  const user = process.env.IMAP_USER ?? process.env.TITAN_SMTP_USER ?? "karthik@workflowtech.info";
  const pass = process.env.IMAP_PASS ?? process.env.TITAN_SMTP_PASS;
  const host = process.env.IMAP_HOST ?? "imap.titan.email";
  const port = Number(process.env.IMAP_PORT ?? 993);

  if (!pass) {
    return { paused: 0, skipped: "missing IMAP_PASS / TITAN_SMTP_PASS for reply inbox" };
  }

  const { data: recipients, error } = await sb
    .from("email_recipients")
    .select("id,email")
    .eq("status", "sent")
    .eq("mails_paused", false);

  if (error) throw error;
  const byEmail = new Map((recipients ?? []).map((r) => [r.email.toLowerCase(), r.id]));

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass }
  });

  let paused = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      for await (const msg of client.fetch({ since }, { envelope: true, source: false })) {
        const from = emailFromAddress(msg.envelope?.from?.[0]?.address);
        if (!from || !byEmail.has(from)) continue;

        const toList = (msg.envelope?.to ?? []).map((t) => emailFromAddress(t.address)).filter(Boolean);
        if (!toList.includes(REPLY_TO) && !toList.includes(user.toLowerCase())) continue;

        const id = byEmail.get(from);
        if (!id) continue;
        const now = new Date().toISOString();
        await sb
          .from("email_recipients")
          .update({ mails_paused: true, pause_reason: "replied", paused_at: now })
          .eq("id", id);
        await sb.from("email_events").insert({ recipient_id: id, kind: "replied" });
        paused++;
        console.log(`Paused (reply): ${from}`);
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { paused };
}

if (process.argv[1]?.includes("check-inbox-replies")) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  checkInboxReplies(sb)
    .then((r) => console.log(r.paused ? `Replies detected: ${r.paused} paused` : "No new replies"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
