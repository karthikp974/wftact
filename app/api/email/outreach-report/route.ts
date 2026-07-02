import { NextRequest, NextResponse } from "next/server";
import { computeDemoEngagement } from "@/lib/outreach-analytics";
import { getSupabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

async function isAuthed() {
  const expected = process.env.WFTACT_DASHBOARD_KEY;
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get("wftact_dashboard")?.value === expected;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaignId = request.nextUrl.searchParams.get("campaign_id");
  const sb = getSupabaseAdmin();

  let recQuery = sb
    .from("email_recipients")
    .select("*")
    .order("opened_at", { ascending: false, nullsFirst: false });

  if (campaignId) recQuery = recQuery.eq("campaign_id", campaignId);

  const [{ data: recipients, error: recErr }, { data: activity, error: actErr }] = await Promise.all([
    recQuery,
    sb.from("activity_events").select("kind, path, meta, created_at").eq("site_key", "demo")
  ]);

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  if (actErr) return NextResponse.json({ error: actErr.message }, { status: 500 });

  const events = activity ?? [];
  const rows = (recipients ?? [])
    .filter((r) => r.opened_at || (r.open_count ?? 0) > 0)
    .map((r) => {
      const demo = computeDemoEngagement(events, r.id);
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        institution: r.institution,
        phone: r.phone,
        state: r.state,
        opened_at: r.opened_at,
        last_open_at: r.last_open_at,
        open_count: r.open_count ?? 0,
        follow_up_sent_at: r.follow_up_sent_at,
        mail_opened: true,
        demo_visited: demo.visited,
        page_views: demo.pageViews,
        unique_pages: demo.uniquePages,
        minutes_spent: demo.minutesSpent,
        demo_first_at: demo.firstVisitAt,
        demo_last_at: demo.lastVisitAt
      };
    });

  const summary = {
    mail_opened: rows.length,
    demo_visited: rows.filter((r) => r.demo_visited).length,
    follow_up_sent: rows.filter((r) => r.follow_up_sent_at).length
  };

  return NextResponse.json({ summary, rows });
}
