/**
 * Outreach mail: Sender.net REST API (preferred) or SMTP (Brevo/Titan).
 * Reply inbox still uses Titan IMAP in check-inbox-replies.mjs.
 */
import nodemailer from "nodemailer";
import { createSmtpTransport, smtpConfigured } from "./smtp-config.mjs";

const SENDER_API_URL = "https://api.sender.net/v2/message/send";

export function mailProvider() {
  if (process.env.SENDER_API_KEY?.trim()) return "sender-api";
  if (smtpConfigured()) return "smtp";
  return null;
}

export function mailConfigured() {
  return mailProvider() != null;
}

function parseFrom(fromField, fallbackName, fallbackAddress) {
  if (typeof fromField === "string") {
    const quoted = fromField.match(/^"([^"]+)"\s*<([^>]+)>$/);
    if (quoted) return { name: quoted[1], email: quoted[2] };
    if (fromField.includes("@")) return { name: fallbackName, email: fromField.trim() };
  }
  return { name: fallbackName, email: fallbackAddress };
}

function parseTo(toField) {
  if (typeof toField !== "string") return { email: String(toField), name: undefined };
  const quoted = toField.match(/^"([^"]+)"\s*<([^>]+)>$/);
  if (quoted) return { name: quoted[1], email: quoted[2] };
  return { email: toField.trim(), name: undefined };
}

async function sendViaSenderApi({ from, to, subject, text, html }) {
  const token = process.env.SENDER_API_KEY?.trim();
  if (!token) throw new Error("SENDER_API_KEY is not set");

  const fromObj = parseFrom(from, process.env.EMAIL_FROM_NAME, process.env.EMAIL_FROM_ADDRESS);
  const toObj = parseTo(to);

  const res = await fetch(SENDER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      from: { email: fromObj.email, name: fromObj.name || fromObj.email },
      to: { email: toObj.email, ...(toObj.name ? { name: toObj.name } : {}) },
      subject,
      text,
      html
    })
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.message ?? body?.error ?? JSON.stringify(body);
    throw new Error(`Sender API ${res.status}: ${detail}`);
  }
  return body;
}

/** Nodemailer-compatible sender for outreach-followup / nurture scripts. */
export function createMailSender() {
  if (process.env.SENDER_API_KEY?.trim()) {
    return {
      sendMail: (opts) =>
        sendViaSenderApi({
          from: opts.from,
          to: opts.to,
          subject: opts.subject,
          text: opts.text,
          html: opts.html
        })
    };
  }
  return createSmtpTransport(nodemailer);
}

export function mailFromDefaults() {
  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? process.env.SMTP_USER ?? "karthik@workflowtech.info";
  const fromName = process.env.EMAIL_FROM_NAME ?? "WorkflowTech";
  return { fromName, fromAddress };
}
