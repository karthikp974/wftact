/** Outbound: Brevo SMTP. Inbound replies: Titan IMAP (see check-inbox-replies.mjs). */
export function smtpPass() {
  return process.env.SMTP_PASS ?? process.env.BREVO_API_KEY ?? "";
}

export function smtpUser() {
  return process.env.SMTP_USER ?? process.env.EMAIL_FROM_ADDRESS ?? "";
}

export function smtpSettings() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const host = process.env.SMTP_HOST ?? "smtp-relay.brevo.com";
  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user: smtpUser(),
      pass: smtpPass()
    },
    ...(port === 587 ? { requireTLS: true } : {})
  };
}

export function createSmtpTransport(nodemailer) {
  return nodemailer.createTransport(smtpSettings());
}

export function smtpConfigured() {
  return Boolean(smtpUser() && smtpPass());
}

export function mailFromAddress() {
  return process.env.EMAIL_FROM_ADDRESS ?? smtpUser();
}
