import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildMailRow,
  computeDemoEngagement,
  type ActivityEventRow
} from "@/lib/outreach-analytics";
import { getSupabaseAdmin } from "@/lib/supabase";

async function isAuthed() {
  const expected = process.env.WFTACT_DASHBOARD_KEY;
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get("wftact_dashboard")?.value === expected;
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const [{ data: recipients }, { data: activity }] = await Promise.all([
    sb.from("email_recipients").select("*").order("opened_at", { ascending: false, nullsFirst: false }),
    sb.from("activity_events").select("kind, path, meta, created_at").eq("site_key", "demo")
  ]);

  const events = (activity ?? []) as ActivityEventRow[];
  const sent = (recipients ?? []).filter((r) => r.opened_at || (r.open_count ?? 0) > 0);

  const rows = sent.map((r, i) => {
    const demoAll = computeDemoEngagement(events, r.id);
    const demoAfter = computeDemoEngagement(events, r.id, r.follow_up_sent_at);
    return buildMailRow(r, i + 1, demoAll, demoAfter);
  });

  return NextResponse.json({
    summary: {
      mail_opened: rows.length,
      demo_visited: rows.filter((r) => r.demo_visited).length,
      follow_up_sent: rows.filter((r) => r.follow_up_sent_at).length
    },
    rows
  });
}
