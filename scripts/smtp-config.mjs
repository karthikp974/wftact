/** SMTP relay (Brevo, Titan, or Sender SMTP user). Reply inbox uses Titan IMAP separately. */
export function smtpSettings() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const host = process.env.SMTP_HOST ?? "smtp.sender.net";
  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    ...(port === 587 ? { requireTLS: true } : {})
  };
}

export function createSmtpTransport(nodemailer) {
  return nodemailer.createTransport(smtpSettings());
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}
