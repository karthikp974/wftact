export const OUTREACH_PHONE = "+918688837809";
export const OUTREACH_SUBJECT =
  "Your live ERP demo is ready. Explore at your convenience";
export const FOLLOWUP_SUBJECT_NO_DEMO = "Following up on the live ERP demo";
export const FOLLOWUP_SUBJECT_DEMO = "Thank you for visiting our ERP demo";

export function demoLink(baseUrl, recipientId) {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/login?wftref=${recipientId}`;
}

export function greeting(name) {
  if (!name?.trim()) return "Dear Sir/Madam,";
  return `Dear ${name.trim()},`;
}

export function buildOutreachHtml({ name, institution, recipientId, demoUrl, hubUrl }) {
  const link = demoLink(demoUrl, recipientId);
  const pixel = `${hubUrl}/api/track/open/${recipientId}`;
  const inst = institution?.trim()
    ? `<p style="margin-bottom:16px;color:#444;font-size:14px">Institution: ${escapeHtml(institution)}</p>`
    : "";

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:0">
<p style="margin-bottom:16px">${escapeHtml(greeting(name))}</p>
<p style="margin-bottom:16px">We built a <strong>live College ERP</strong> for management institutions. It covers attendance, exams, student and teacher portals, and admin workflows in one place.</p>
<p style="margin-bottom:20px">As an <strong>AIMS member institution</strong>, you can explore it directly. No signup or installation is required.</p>
<p style="margin-bottom:24px"><a href="${link}" style="display:inline-block;background:#1e5eff;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Open live demo</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Demo link:</strong> <a href="${link}">${link}</a></p>
<p style="margin-bottom:8px;font-size:15px"><strong>Login:</strong> admin</p>
<p style="margin-bottom:20px;font-size:15px"><strong>Password:</strong> Admin@12345</p>
${inst}
<p style="margin-bottom:16px;color:#444;font-size:14px">If it fits your campus workflow, we are happy to arrange a short walkthrough at a time that suits you.</p>
<p style="margin-top:28px;margin-bottom:4px">Warm regards,</p>
<p style="margin:0"><strong>Karthik</strong><br/>WorkflowTech<br/>
<a href="mailto:karthik@workflowtech.info">karthik@workflowtech.info</a><br/>
${OUTREACH_PHONE}<br/>
<a href="https://workflowtech.info">workflowtech.info</a></p>
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;opacity:0" />
</body></html>`;
}

export function buildOutreachText({ name, institution, recipientId, demoUrl }) {
  const link = demoLink(demoUrl, recipientId);
  return `${greeting(name)}

We built a live College ERP for management institutions. It covers attendance, exams, student and teacher portals, and admin workflows in one place.

As an AIMS member institution, you can explore it directly. No signup or installation is required.

Open live demo: ${link}
Login: admin
Password: Admin@12345
${institution?.trim() ? `\nInstitution: ${institution.trim()}\n` : ""}
If it fits your campus workflow, we are happy to arrange a short walkthrough at a time that suits you.

Warm regards,
Karthik
WorkflowTech
karthik@workflowtech.info
${OUTREACH_PHONE}
workflowtech.info`;
}

export function buildFollowUpHtml({ name, recipientId, demoUrl, visitedDemo }) {
  const link = demoLink(demoUrl, recipientId);
  const body = visitedDemo
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
<p style="margin-bottom:16px">${escapeHtml(greeting(name))}</p>
${body}
<p style="margin-top:28px;margin-bottom:4px">Warm regards,</p>
<p style="margin:0"><strong>Karthik</strong><br/>WorkflowTech<br/>
<a href="mailto:karthik@workflowtech.info">karthik@workflowtech.info</a><br/>
${OUTREACH_PHONE}</p>
</body></html>`;
}

export function buildFollowUpText({ name, recipientId, demoUrl, visitedDemo }) {
  const link = demoLink(demoUrl, recipientId);
  if (visitedDemo) {
    return `${greeting(name)}

Thank you for exploring our College ERP demo.

We hope the student, teacher, and admin portals gave you a useful preview of day to day campus workflows.

If any question came up while browsing, we would be glad to clarify on a short call or reply to this email.

Warm regards,
Karthik
WorkflowTech
karthik@workflowtech.info
${OUTREACH_PHONE}`;
  }
  return `${greeting(name)}

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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
