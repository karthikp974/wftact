import { createClient, SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

export function getPublicHubUrl() {
  const explicit = process.env.NEXT_PUBLIC_HUB_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function verifyIngestKey(request: Request) {
  const expected = process.env.WFTACT_INGEST_KEY;
  if (!expected) return false;
  const header = request.headers.get("x-wftact-key");
  return header === expected;
}

export function verifyDashboardKey(request: Request) {
  const expected = process.env.WFTACT_DASHBOARD_KEY;
  if (!expected) return false;
  const header = request.headers.get("x-dashboard-key") ?? request.headers.get("authorization");
  if (header === expected || header === `Bearer ${expected}`) return true;
  const cookie = request.headers.get("cookie") ?? "";
  if (cookie.includes(`wftact_dashboard=${expected}`)) return true;
  return false;
}

/** IST date key yyyy-mm-dd for grouping */
export function istDateKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** IST hour 0-23 */
export function istHour(d: Date) {
  return Number(
    d.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })
  );
}

export function buildDayHourGrid(events: { created_at: string }[]) {
  const byDay: Record<string, number[]> = {};
  for (const e of events) {
    const d = new Date(e.created_at);
    const day = istDateKey(d);
    const hour = istHour(d);
    if (!byDay[day]) byDay[day] = Array.from({ length: 24 }, () => 0);
    byDay[day][hour] += 1;
  }
  return byDay;
}
