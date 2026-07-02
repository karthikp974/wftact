import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { groupActivitySessions, istDayBounds } from "@/lib/activity-utils";
import { enrichSessionLocations } from "@/lib/ip-geo";
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

  const params = request.nextUrl.searchParams;
  const site = params.get("site")?.trim() || "all";
  const date = params.get("date")?.trim();
  const kind = params.get("kind")?.trim() || "all";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD IST)" }, { status: 400 });
  }

  const { start, end } = istDayBounds(date);
  const sb = getSupabaseAdmin();

  let query = sb
    .from("activity_events")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });

  if (site !== "all") {
    query = query.eq("site_key", site);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data ?? [];
  if (kind === "login") {
    const loginUsers = new Set(
      rows.filter((r) => r.kind === "LOGIN").map((r) => `${r.site_key}:${r.user_label}`)
    );
    rows = rows.filter((r) => {
      if (r.kind === "LOGIN") return true;
      return loginUsers.has(`${r.site_key}:${r.user_label}`);
    });
  } else if (kind === "page") {
    rows = rows.filter((r) => r.kind === "PAGE_VIEW" || r.kind === "HEARTBEAT");
  }

  const sessions = groupActivitySessions(rows);
  const resolveLocation = await enrichSessionLocations(
    sessions.map((s) => ({
      ip: s.ip,
      latitude: s.latitude,
      longitude: s.longitude
    }))
  );
  for (const session of sessions) {
    const label = resolveLocation({
      ip: session.ip,
      latitude: session.latitude,
      longitude: session.longitude
    });
    session.location = label.location;
    session.ip = label.ip;
  }

  const loginCount = sessions.length;
  const pageViewCount = rows.filter((r) => r.kind === "PAGE_VIEW").length;

  return NextResponse.json({
    date,
    site,
    loginCount,
    pageViewCount,
    sessions
  });
}
