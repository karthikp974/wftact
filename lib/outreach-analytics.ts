export type ActivityEventRow = {
  kind: string;
  path: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type DemoEngagement = {
  visited: boolean;
  pageViews: number;
  uniquePages: string[];
  pagesDetailed: Array<{ path: string; at: string; kind: string }>;
  minutesSpent: number;
  secondsSpent: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  heartbeatCount: number;
};

const HEARTBEAT_INTERVAL_SEC = 90;
const FOLLOWUP_DELAY_MS = Number(process.env.FOLLOWUP_DELAY_MS ?? 45 * 60 * 1000);

export function outreachIdFromMeta(meta: Record<string, unknown> | null | undefined) {
  const id = meta?.outreach_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function computeDemoEngagement(
  events: ActivityEventRow[],
  outreachId: string,
  afterIso?: string | null
): DemoEngagement {
  let rows = events
    .filter((e) => outreachIdFromMeta(e.meta) === outreachId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (afterIso) {
    const after = new Date(afterIso).getTime();
    rows = rows.filter((r) => new Date(r.created_at).getTime() >= after);
  }

  const empty: DemoEngagement = {
    visited: false,
    pageViews: 0,
    uniquePages: [],
    pagesDetailed: [],
    minutesSpent: 0,
    secondsSpent: 0,
    firstVisitAt: null,
    lastVisitAt: null,
    heartbeatCount: 0
  };

  if (!rows.length) return empty;

  const pageEvents = rows.filter((r) => r.kind === "PAGE_VIEW");
  const heartbeats = rows.filter((r) => r.kind === "HEARTBEAT");
  const logins = rows.filter((r) => r.kind === "LOGIN");

  const paths = new Set<string>();
  const pagesDetailed: DemoEngagement["pagesDetailed"] = [];

  for (const row of pageEvents) {
    if (row.path) {
      paths.add(row.path);
      pagesDetailed.push({ path: row.path, at: row.created_at, kind: "Page" });
    }
  }

  for (const row of logins) {
    if (row.path && !paths.has(row.path)) {
      paths.add(row.path);
      pagesDetailed.push({ path: row.path, at: row.created_at, kind: "Login" });
    }
  }

  const hasDemoActivity = pageEvents.length > 0 || logins.length > 0;
  if (!hasDemoActivity) return empty;

  const first = rows[0]!.created_at;
  const last = rows[rows.length - 1]!.created_at;
  const spanSec = Math.max(0, (new Date(last).getTime() - new Date(first).getTime()) / 1000);
  const heartbeatSec = heartbeats.length * HEARTBEAT_INTERVAL_SEC;
  const secondsSpent = Math.round(Math.max(spanSec, heartbeatSec, pageEvents.length > 0 ? 30 : 0));
  const minutesSpent = Math.max(pageEvents.length > 0 || heartbeats.length > 0 ? 1 : 0, Math.round(secondsSpent / 60));

  return {
    visited: true,
    pageViews: pageEvents.length,
    uniquePages: [...paths],
    pagesDetailed: pagesDetailed.sort((a, b) => a.at.localeCompare(b.at)),
    minutesSpent,
    secondsSpent,
    firstVisitAt: first,
    lastVisitAt: last,
    heartbeatCount: heartbeats.length
  };
}

export type EmailRecipientRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  institution: string | null;
  state: string | null;
  sent_at: string | null;
  opened_at: string | null;
  open_count: number | null;
  last_open_at: string | null;
  follow_up_sent_at: string | null;
  follow_up_type: string | null;
  follow_up_opened_at: string | null;
  follow_up_open_count: number | null;
  follow_up_last_open_at: string | null;
  nurture_step: number | null;
  last_nurture_sent_at: string | null;
  nurture_opened_at: string | null;
  nurture_open_count: number | null;
  nurture_last_open_at: string | null;
  status: string;
};

export type MailRow = {
  mail_no: number;
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  institution: string | null;
  state: string | null;
  sent_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  mail_opened: boolean;
  demo_visited: boolean;
  page_views: number;
  unique_pages: string[];
  pages_detailed: DemoEngagement["pagesDetailed"];
  minutes_spent: number;
  seconds_spent: number;
  demo_first_at: string | null;
  demo_last_at: string | null;
  follow_up_sent_at: string | null;
  follow_up_type: string | null;
  follow_up_label: string | null;
  follow_up_due_at: string | null;
  follow_up_time_left_sec: number | null;
  follow_up_opened_at: string | null;
  follow_up_last_open_at: string | null;
  follow_up_open_count: number;
  follow_up_opened: boolean;
  nurture_step: number;
  last_nurture_sent_at: string | null;
  nurture_opened: boolean;
  nurture_last_open_at: string | null;
  post_follow_up_demo: boolean;
  engagement_label: string;
};

function istDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function followUpLabel(type: string | null, demoVisited: boolean) {
  if (type === "visited_demo") return "Mail 3 (opened + demo)";
  if (type === "no_demo") return "Mail 2 (opened, no demo)";
  if (demoVisited) return "Mail 3 (opened + demo)";
  return "Mail 2 (opened, no demo)";
}

export function buildMailRow(
  recipient: EmailRecipientRow,
  mailNo: number,
  demoAll: DemoEngagement,
  demoAfterFollowUp: DemoEngagement
): MailRow {
  const mailOpened = !!(recipient.opened_at || (recipient.open_count ?? 0) > 0);
  const followUpOpened = !!(
    recipient.follow_up_opened_at || (recipient.follow_up_open_count ?? 0) > 0
  );
  const followUpSent = !!recipient.follow_up_sent_at;

  let followUpDueAt: string | null = null;
  let followUpTimeLeftSec: number | null = null;
  if (mailOpened && recipient.opened_at && !followUpSent) {
    const due = new Date(new Date(recipient.opened_at).getTime() + FOLLOWUP_DELAY_MS);
    followUpDueAt = due.toISOString();
    followUpTimeLeftSec = Math.max(0, Math.round((due.getTime() - Date.now()) / 1000));
  }

  let engagementLabel = "Not opened";
  if (mailOpened && demoAll.visited) engagementLabel = "Opened mail + demo";
  else if (mailOpened) engagementLabel = "Opened mail only";

  if (followUpSent) {
    if (followUpOpened && demoAfterFollowUp.visited) engagementLabel = "Follow up opened + demo";
    else if (followUpOpened) engagementLabel = "Follow up opened";
    else if (demoAfterFollowUp.visited) engagementLabel = "Follow up sent + demo (no follow open)";
    else engagementLabel = "Follow up sent, not opened";
  }

  const followUpType =
    recipient.follow_up_type ?? (demoAll.visited ? "visited_demo" : "no_demo");

  return {
    mail_no: mailNo,
    id: recipient.id,
    name: recipient.name,
    email: recipient.email,
    phone: recipient.phone,
    institution: recipient.institution,
    state: recipient.state,
    sent_at: recipient.sent_at,
    first_opened_at: recipient.opened_at,
    last_opened_at: recipient.last_open_at,
    open_count: recipient.open_count ?? 0,
    mail_opened: mailOpened,
    demo_visited: demoAll.visited,
    page_views: demoAll.pageViews,
    unique_pages: demoAll.uniquePages,
    pages_detailed: demoAll.pagesDetailed,
    minutes_spent: demoAll.minutesSpent,
    seconds_spent: demoAll.secondsSpent,
    demo_first_at: demoAll.firstVisitAt,
    demo_last_at: demoAll.lastVisitAt,
    follow_up_sent_at: recipient.follow_up_sent_at,
    follow_up_type: followUpSent ? followUpType : null,
    follow_up_label: followUpSent ? followUpLabel(recipient.follow_up_type, demoAll.visited) : null,
    follow_up_due_at: followUpDueAt,
    follow_up_time_left_sec: followUpTimeLeftSec,
    follow_up_opened_at: recipient.follow_up_opened_at,
    follow_up_last_open_at: recipient.follow_up_last_open_at,
    follow_up_open_count: recipient.follow_up_open_count ?? 0,
    follow_up_opened: followUpOpened,
    nurture_step: recipient.nurture_step ?? 0,
    last_nurture_sent_at: recipient.last_nurture_sent_at,
    nurture_opened: !!(
      recipient.nurture_opened_at || (recipient.nurture_open_count ?? 0) > 0
    ),
    nurture_last_open_at: recipient.nurture_last_open_at,
    post_follow_up_demo: demoAfterFollowUp.visited,
    engagement_label: engagementLabel
  };
}

export function filterBySentDate(rows: MailRow[], dateIst: string | null) {
  if (!dateIst) return rows;
  return rows.filter((r) => istDate(r.sent_at) === dateIst);
}

export function segmentRows(rows: MailRow[]) {
  const followUp2NotOpened = rows.filter(
    (r) =>
      r.follow_up_sent_at &&
      !r.follow_up_opened &&
      (r.follow_up_type === "no_demo" || (!r.follow_up_type && !r.demo_visited))
  );
  const followUp3NotOpened = rows.filter(
    (r) =>
      r.follow_up_sent_at &&
      !r.follow_up_opened &&
      (r.follow_up_type === "visited_demo" || (!r.follow_up_type && r.demo_visited))
  );

  return {
    all_sent: rows.filter((r) => r.sent_at),
    not_opened: rows.filter((r) => r.sent_at && !r.mail_opened),
    opened_no_demo: rows.filter((r) => r.mail_opened && !r.demo_visited),
    opened_with_demo: rows.filter((r) => r.mail_opened && r.demo_visited),
    follow_up_2_not_opened: followUp2NotOpened,
    follow_up_3_not_opened: followUp3NotOpened
  };
}

export { istDate as mailSentIstDate };
