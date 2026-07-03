/** SMTP relay (Titan default). Set MAIL_PROVIDER=smtp to force SMTP over Sender API. */
export function smtpSettings() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  const host = process.env.SMTP_HOST ?? "smtp.titan.email";
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
