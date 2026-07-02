import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildDayHourGrid, getSupabaseAdmin } from "@/lib/supabase";

async function isAuthed(request: NextRequest) {
  const expected = process.env.WFTACT_DASHBOARD_KEY;
  if (!expected) return false;
  const header = request.headers.get("x-dashboard-key");
  if (header === expected) return true;
  const cookieStore = await cookies();
  return cookieStore.get("wftact_dashboard")?.value === expected;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const sb = getSupabaseAdmin();

  const [sitesRes, activityRes, campaignsRes, recipientsRes] = await Promise.all([
    sb.from("sites").select("*").order("key"),
    sb.from("activity_events").select("*").gte("created_at", since).order("created_at", { ascending: false }),
    sb.from("email_campaigns").select("*").order("created_at", { ascending: false }),
    sb.from("email_recipients").select("*").order("created_at", { ascending: false }).limit(5000)
  ]);

  if (sitesRes.error) return NextResponse.json({ error: sitesRes.error.message }, { status: 500 });
  if (activityRes.error) return NextResponse.json({ error: activityRes.error.message }, { status: 500 });
  if (campaignsRes.error) return NextResponse.json({ error: campaignsRes.error.message }, { status: 500 });
  if (recipientsRes.error) return NextResponse.json({ error: recipientsRes.error.message }, { status: 500 });

  const activity = activityRes.data ?? [];
  const recipients = recipientsRes.data ?? [];

  const bySite: Record<string, { logins: number; pageViews: number; events: number }> = {};
  for (const row of activity) {
    if (!bySite[row.site_key]) bySite[row.site_key] = { logins: 0, pageViews: 0, events: 0 };
    bySite[row.site_key].events += 1;
    if (row.kind === "LOGIN") bySite[row.site_key].logins += 1;
    if (row.kind === "PAGE_VIEW") bySite[row.site_key].pageViews += 1;
  }

  const sent = recipients.filter((r) => r.status === "sent" || r.sent_at);
  const opened = sent.filter((r) => r.opened_at || (r.open_count ?? 0) > 0);
  const notOpened = sent.filter((r) => !r.opened_at && !(r.open_count ?? 0));

  const emailOpenEvents = recipients.flatMap((r) => {
    const times: string[] = [];
    if (r.opened_at) times.push(r.opened_at);
    if (r.last_open_at && r.last_open_at !== r.opened_at) times.push(r.last_open_at);
    return times.map((created_at) => ({ created_at }));
  });

  return NextResponse.json({
    sites: sitesRes.data,
    since,
    activity: {
      total: activity.length,
      bySite,
      dayHour: buildDayHourGrid(activity.map((a) => ({ created_at: a.created_at }))),
      recent: activity.slice(0, 50)
    },
    email: {
      campaigns: campaignsRes.data,
      sent: sent.length,
      opened: opened.length,
      notOpened: notOpened.length,
      pending: recipients.filter((r) => r.status === "pending").length,
      failed: recipients.filter((r) => r.status === "failed").length,
      openRate: sent.length ? Math.round((opened.length / sent.length) * 100) : 0,
      dayHourOpens: buildDayHourGrid(emailOpenEvents),
      dayHourSends: buildDayHourGrid(
        sent.filter((r) => r.sent_at).map((r) => ({ created_at: r.sent_at as string }))
      ),
      recentOpens: opened
        .sort((a, b) => (b.last_open_at ?? "").localeCompare(a.last_open_at ?? ""))
        .slice(0, 30)
    }
  });
}
