export const OUTREACH_PHONE = "+918688837809";
export const OUTREACH_SUBJECT =
  "Your live ERP demo is ready. Explore at your convenience";
export const FOLLOWUP_SUBJECT_NO_DEMO = "Following up on the live ERP demo";
export const FOLLOWUP_SUBJECT_DEMO = "Thank you for visiting our ERP demo";

export const NURTURE_SUBJECTS = [
  "How campuses usually decide on ERP pricing",
  "One time license, yearly plan, and fast data migration",
  "Still evaluating ERP options for your campus"
];

export const PRICING_INTRO =
  "Many academic leaders tell us the hardest part of an ERP decision is not the demo itself, but understanding cost, commitment, and migration effort in plain terms.";

export function demoLink(baseUrl, recipientId) {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/login?wftref=${recipientId}`;
}

export function greeting(name) {
  if (!name?.trim()) return "Dear Sir/Madam,";
  return `Dear ${name.trim()},`;
}

export function welcomeLine(name) {
  const who = name?.trim() ? name.trim() : "there";
  return `Greetings from WorkflowTech. We are glad to connect with you, ${who}.`;
}

/** Plain visible footer so Gmail does not hide contact behind three dots */
export function emailFooterHtml() {
  return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:15px;color:#1a1a1a;line-height:1.8">
<p style="margin:0 0 12px">Warm regards,</p>
<p style="margin:0 0 6px"><strong>Karthik</strong></p>
<p style="margin:0 0 6px">WorkflowTech</p>
<p style="margin:0 0 6px">Email: karthik@workflowtech.info</p>
<p style="margin:0 0 6px">Phone: ${OUTREACH_PHONE}</p>
<p style="margin:0">Website: workflowtech.info</p>
</div>`;
}

export function emailFooterText() {
  return `Warm regards,
Karthik
WorkflowTech
Email: karthik@workflowtech.info
Phone: ${OUTREACH_PHONE}
Website: workflowtech.info`;
}

function pricingEmailBodyHtml(link) {
  return `<p style="margin-bottom:16px">${escapeHtml(PRICING_INTRO)}</p>
<p style="margin-bottom:12px;font-size:15px"><strong>1. One time payment license</strong><br/>A single upfront license for institutions that prefer full ownership and a fixed investment.</p>
<p style="margin-bottom:12px;font-size:15px"><strong>2. Yearly subscription</strong><br/>A predictable annual plan with ongoing support and product updates.</p>
<p style="margin-bottom:16px;font-size:15px">If you share your existing records in <strong>PDF or Excel</strong>, we can migrate them into our ERP in <strong>hours</strong>, not weeks, so your team can evaluate with real campus data instead of a blank demo.</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> ${link}</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:16px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:0;font-size:15px">If a short call would help you compare options calmly, reply to this email or call ${OUTREACH_PHONE}.</p>`;
}

function pricingEmailBodyText(link) {
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

export function buildOutreachHtml({ name, recipientId, demoUrl, hubUrl }) {
  const link = demoLink(demoUrl, recipientId);
  const pixel = `${hubUrl}/api/track/open/${recipientId}`;

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:0">
<p style="margin-bottom:16px">${escapeHtml(greeting(name))}</p>
<p style="margin-bottom:16px">${escapeHtml(welcomeLine(name))}</p>
<p style="margin-bottom:16px">We built a <strong>live College ERP</strong> for management institutions. It covers attendance, exams, student and teacher portals, and admin workflows in one place.</p>
<p style="margin-bottom:20px">You can explore it directly on our live demo. No signup or installation is required.</p>
<p style="margin-bottom:24px"><a href="${link}" style="display:inline-block;background:#1e5eff;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Open live demo</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:20px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:16px;color:#444;font-size:14px">If it fits your campus workflow, we are happy to arrange a short walkthrough at a time that suits you.</p>
${emailFooterHtml()}
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;opacity:0" />
</body></html>`;
}

export function buildOutreachText({ name, recipientId, demoUrl }) {
  const link = demoLink(demoUrl, recipientId);
  return `${greeting(name)}

${welcomeLine(name)}

We built a live College ERP for management institutions. It covers attendance, exams, student and teacher portals, and admin workflows in one place.

You can explore it directly on our live demo. No signup or installation is required.

Open live demo: ${link}
Login: admin
Password: Admin@12345

If it fits your campus workflow, we are happy to arrange a short walkthrough at a time that suits you.

${emailFooterText()}`;
}

export function buildFollowUpHtml({ name, recipientId, demoUrl, visitedDemo, hubUrl }) {
  const link = demoLink(demoUrl, recipientId);
  const pixel = `${hubUrl.replace(/\/$/, "")}/api/track/open/${recipientId}?kind=follow_up`;
  const body = visitedDemo
    ? pricingEmailBodyHtml(`<a href="${link}">${link}</a>`)
    : `<p style="margin-bottom:16px">Thank you for opening our message about the College ERP demo.</p>
<p style="margin-bottom:16px">The live demo is still available whenever it suits you.</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:16px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:0;font-size:15px">If you would like a brief walkthrough, reply to this email or call ${OUTREACH_PHONE}.</p>`;

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:0">
<p style="margin-bottom:16px">${escapeHtml(greeting(name))}</p>
${body}
${emailFooterHtml()}
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;opacity:0" />
</body></html>`;
}

export function buildFollowUpText({ name, recipientId, demoUrl, visitedDemo }) {
  const link = demoLink(demoUrl, recipientId);
  if (visitedDemo) {
    return `${greeting(name)}

${pricingEmailBodyText(link)}

${emailFooterText()}`;
  }
  return `${greeting(name)}

Thank you for opening our message about the College ERP demo.

The live demo is still available whenever it suits you.

Demo link: ${link}
Login: admin
Password: Admin@12345

If you would like a brief walkthrough, reply to this email or call us at ${OUTREACH_PHONE}.

${emailFooterText()}`;
}

function nurtureIntro(step) {
  if (step === 1) {
    return PRICING_INTRO;
  }
  if (step === 2) {
    return "If pricing clarity would help your internal discussion, here is how institutions usually compare our two commercial options. One concern we hear often is data migration. Teams worry that switching systems will disrupt years of records.";
  }
  return "If ERP evaluation is still on your desk, I wanted to leave one practical summary with you before you close the loop internally.";
}

export function nurtureSubject(step) {
  const idx = Math.min(Math.max(step, 1), NURTURE_SUBJECTS.length) - 1;
  return NURTURE_SUBJECTS[idx];
}

function nurturePricingBlockHtml(link) {
  return `<p style="margin-bottom:12px;font-size:15px"><strong>1. One time payment license</strong><br/>A single upfront license for institutions that prefer full ownership and a fixed investment.</p>
<p style="margin-bottom:12px;font-size:15px"><strong>2. Yearly subscription</strong><br/>A predictable annual plan with ongoing support and product updates.</p>
<p style="margin-bottom:16px;font-size:15px">If you share your existing records in <strong>PDF or Excel</strong>, we can migrate them into our ERP in <strong>hours</strong>, not weeks, so your team can evaluate with real campus data instead of a blank demo.</p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:16px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
<p style="margin-bottom:16px">If a short call would help you compare options calmly, reply to this email or call ${OUTREACH_PHONE}.</p>`;
}

function nurturePricingBlockText(link) {
  return `1. One time payment license
A single upfront license for institutions that prefer full ownership and a fixed investment.

2. Yearly subscription
A predictable annual plan with ongoing support and product updates.

If you share your existing records in PDF or Excel, we can migrate them into our ERP in hours, not weeks, so your team can evaluate with real campus data instead of a blank demo.

Demo link: ${link}
Login: admin
Password: Admin@12345

If a short call would help you compare options calmly, reply to this email or call ${OUTREACH_PHONE}.`;
}

export function buildNurtureHtml({ name, recipientId, demoUrl, hubUrl, step }) {
  const link = demoLink(demoUrl, recipientId);
  const pixel = `${hubUrl.replace(/\/$/, "")}/api/track/open/${recipientId}?kind=nurture&step=${step}`;
  const intro = nurtureIntro(step);

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:0">
<p style="margin-bottom:16px">${escapeHtml(greeting(name))}</p>
<p style="margin-bottom:16px">${escapeHtml(intro)}</p>
${nurturePricingBlockHtml(link)}
${emailFooterHtml()}
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;opacity:0" />
</body></html>`;
}

export function buildNurtureText({ name, recipientId, demoUrl, step }) {
  const link = demoLink(demoUrl, recipientId);
  const intro = nurtureIntro(step);
  return `${greeting(name)}

${intro}

${nurturePricingBlockText(link)}

${emailFooterText()}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
