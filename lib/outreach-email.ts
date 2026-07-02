export const OUTREACH_PHONE = "+918688837809";
export const OUTREACH_SUBJECT =
  "Your live ERP demo is ready. Explore at your convenience";
export const FOLLOWUP_SUBJECT_NO_DEMO = "Following up on the live ERP demo";
export const FOLLOWUP_SUBJECT_DEMO = "Thank you for visiting our ERP demo";

export const PRICING_INTRO =
  "Many academic leaders tell us the hardest part of an ERP decision is not the demo itself, but understanding cost, commitment, and migration effort in plain terms.";

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

function emailFooterHtml() {
  return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:15px;color:#1a1a1a;line-height:1.8">
<p style="margin:0 0 12px">Warm regards,</p>
<p style="margin:0 0 6px"><strong>Karthik</strong></p>
<p style="margin:0 0 6px">WorkflowTech</p>
<p style="margin:0 0 6px">Email: karthik@workflowtech.info</p>
<p style="margin:0 0 6px">Phone: ${OUTREACH_PHONE}</p>
<p style="margin:0">Website: workflowtech.info</p>
</div>`;
}

function emailFooterText() {
  return `Warm regards,
Karthik
WorkflowTech
Email: karthik@workflowtech.info
Phone: ${OUTREACH_PHONE}
Website: workflowtech.info`;
}

function pricingEmailBodyHtml(link: string) {
  return `<p style="margin-bottom:16px">${escapeHtml(PRICING_INTRO)}</p>
<p style="margin-bottom:12px;font-size:15px"><strong>1. One time payment license</strong><br/>A single upfront license for institutions that prefer full ownership and a fixed investment.</p>
<p style="margin-bottom:12px;font-size:15px"><strong>2. Yearly subscription</strong><br/>A predictable annual plan with ongoing support and product updates.</p>
<p style="margin-bottom:16px;font-size:15px">If you share your existing records in <strong>PDF or Excel</strong>, we can migrate them into our ERP in <strong>hours</strong>, not weeks, so your team can evaluate with real campus data instead of a blank demo.</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:16px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:0;font-size:15px">If a short call would help you compare options calmly, reply to this email or call ${OUTREACH_PHONE}.</p>`;
}

function pricingEmailBodyText(link: string) {
  return `${PRICING_INTRO}

1. One time payment license
A single upfront license for institutions that prefer full ownership and a fixed investment.

2. Yearly subscription
A predictable annual plan with ongoing support and product updates.

If you share your existing records in PDF or Excel, we can migrate them into our ERP in hours, not weeks, so your team can evaluate with real campus data instead of a blank demo.

Demo link: ${link}
Login: admin
Password: Admin@12345

If a short call would help you compare options calmly, reply to this email or call ${OUTREACH_PHONE}.`;
}

export function buildFollowUpHtml(input: {
  name: string | null;
  recipientId: string;
  demoUrl: string;
  visitedDemo: boolean;
  hubUrl: string;
}) {
  const link = demoLink(input.demoUrl, input.recipientId);
  const pixel = `${input.hubUrl.replace(/\/$/, "")}/api/track/open/${input.recipientId}?kind=follow_up`;
  const body = input.visitedDemo
    ? pricingEmailBodyHtml(link)
    : `<p style="margin-bottom:16px">Thank you for opening our message about the College ERP demo.</p>
<p style="margin-bottom:16px">The live demo is still available whenever it suits you.</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:16px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:0;font-size:15px">If you would like a brief walkthrough, reply to this email or call us at ${OUTREACH_PHONE}.</p>`;

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:0">
<p style="margin-bottom:16px">${escapeHtml(greeting(input.name))}</p>
${body}
${emailFooterHtml()}
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;opacity:0" />
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

${pricingEmailBodyText(link)}

${emailFooterText()}`;
  }
  return `${greeting(input.name)}

Thank you for opening our message about the College ERP demo.

The live demo is still available whenever it suits you.

Demo link: ${link}
Login: admin
Password: Admin@12345

If you would like a brief walkthrough, reply to this email or call us at ${OUTREACH_PHONE}.

${emailFooterText()}`;
}
