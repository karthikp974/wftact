import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
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

async function tryPort(port) {
  const secure = port === 465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.titan.email",
    port,
    secure,
    requireTLS: !secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { minVersion: "TLSv1.2", servername: "smtp.titan.email" }
  });
  await transport.verify();
  console.log(`Port ${port}: OK`);
}

for (const port of [587, 465]) {
  try {
    await tryPort(port);
  } catch (e) {
    console.log(`Port ${port}: FAIL — ${e.message}`);
  }
}
