export const OUTREACH_PHONE = "+918688837809";
export const OUTREACH_SUBJECT =
  "Your live ERP demo is ready. Explore at your convenience";
export const FOLLOWUP_SUBJECT_NO_DEMO = "Following up on the live ERP demo";
export const FOLLOWUP_SUBJECT_DEMO = "Thank you for visiting our ERP demo";

export function demoLink(baseUrl: string, recipientId: string) {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/login?wftref=${recipientId}`;
}

export function greeting(name: string | null | undefined) {
  if (!name?.trim()) return "Dear Sir/Madam,";
  return `Dear ${name.trim()},`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFollowUpHtml(input: {
  name: string | null;
  recipientId: string;
  demoUrl: string;
  visitedDemo: boolean;
}) {
  const link = demoLink(input.demoUrl, input.recipientId);
  const body = input.visitedDemo
    ? `<p style="margin-bottom:16px">Thank you for exploring our College ERP demo.</p>
<p style="margin-bottom:16px">We hope the student, teacher, and admin portals gave you a useful preview of day to day campus workflows.</p>
<p style="margin-bottom:16px">If any question came up while browsing, we would be glad to clarify on a short call or reply to this email.</p>`
    : `<p style="margin-bottom:16px">Thank you for opening our message about the College ERP demo.</p>
<p style="margin-bottom:16px">The live demo is still available whenever it suits you.</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:16px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:16px">If you would like a brief walkthrough, reply to this email or call us at ${OUTREACH_PHONE}.</p>`;

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:0">
<p style="margin-bottom:16px">${escapeHtml(greeting(input.name))}</p>
${body}
<p style="margin-top:28px;margin-bottom:4px">Warm regards,</p>
<p style="margin:0"><strong>Karthik</strong><br/>WorkflowTech<br/>
<a href="mailto:karthik@workflowtech.info">karthik@workflowtech.info</a><br/>
${OUTREACH_PHONE}</p>
</body></html>`;
}

export function buildFollowUpText(input: {
  name: string | null;
  recipientId: string;
  demoUrl: string;
  visitedDemo: boolean;
}) {
  const link = demoLink(input.demoUrl, input.recipientId);
  if (input.visitedDemo) {
    return `${greeting(input.name)}

Thank you for exploring our College ERP demo.

We hope the student, teacher, and admin portals gave you a useful preview of day to day campus workflows.

If any question came up while browsing, we would be glad to clarify on a short call or reply to this email.

Warm regards,
Karthik
WorkflowTech
karthik@workflowtech.info
${OUTREACH_PHONE}`;
  }
  return `${greeting(input.name)}

Thank you for opening our message about the College ERP demo.

The live demo is still available whenever it suits you.

Demo link: ${link}
Login: admin
Password: Admin@12345

If you would like a brief walkthrough, reply to this email or call us at ${OUTREACH_PHONE}.

Warm regards,
Karthik
WorkflowTech
karthik@workflowtech.info
${OUTREACH_PHONE}`;
}
