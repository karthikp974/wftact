/** SMTP relay (Titan default). Set MAIL_PROVIDER=smtp to force SMTP over Sender API. */
export function smtpSettings() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const host = process.env.SMTP_HOST ?? "smtp.titan.email";
  const base = {
    host,
    port,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    tls: { minVersion: "TLSv1.2", servername: host }
  };
  if (port === 465) {
    return { ...base, secure: true };
  }
  return { ...base, secure: false, requireTLS: true };
}

export function createSmtpTransport(nodemailer) {
  return nodemailer.createTransport(smtpSettings());
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}
