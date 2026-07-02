import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildMailRow,
  computeDemoEngagement,
  filterBySentDate,
  mailSentIstDate,
  segmentRows,
  type ActivityEventRow
} from "@/lib/outreach-analytics";
import { getSupabaseAdmin } from "@/lib/supabase";

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

  const date = request.nextUrl.searchParams.get("date")?.trim() || null;

  const sb = getSupabaseAdmin();
  const [{ data: recipients, error: recErr }, { data: activity, error: actErr }] = await Promise.all([
    sb.from("email_recipients").select("*").order("sent_at", { ascending: true }),
    sb.from("activity_events").select("kind, path, meta, created_at").eq("site_key", "demo")
  ]);

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  if (actErr) return NextResponse.json({ error: actErr.message }, { status: 500 });

  const events = (activity ?? []) as ActivityEventRow[];
  const sent = (recipients ?? []).filter((r) => r.sent_at && r.status === "sent");

  const allRows = sent.map((r, i) => {
    const demoAll = computeDemoEngagement(events, r.id);
    const demoAfter = computeDemoEngagement(events, r.id, r.follow_up_sent_at);
    return buildMailRow(r, i + 1, demoAll, demoAfter);
  });

  const filtered = filterBySentDate(allRows, date);
  const segments = segmentRows(filtered);

  const availableDates = [...new Set(allRows.map((r) => mailSentIstDate(r.sent_at)).filter(Boolean))].sort(
    (a, b) => (b as string).localeCompare(a as string)
  );

  return NextResponse.json({
    date,
    available_dates: availableDates,
    counts: {
      all_sent: segments.all_sent.length,
      not_opened: segments.not_opened.length,
      opened_no_demo: segments.opened_no_demo.length,
      opened_with_demo: segments.opened_with_demo.length,
      follow_up_2_not_opened: segments.follow_up_2_not_opened.length,
      follow_up_3_not_opened: segments.follow_up_3_not_opened.length
    },
    segments
  });
}
