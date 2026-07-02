/** IST calendar day bounds as ISO timestamps for Supabase queries */
export function istDayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function todayIstDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function parseDevice(userAgent: string | null | undefined) {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  let os = "Unknown OS";
  if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "Mac";
  else if (ua.includes("linux")) os = "Linux";

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari";

  const mobile = ua.includes("mobile") || ua.includes("iphone") || ua.includes("android");
  return `${browser} · ${os}${mobile ? " · Mobile" : ""}`;
}

export type ActivityRow = {
  id: string;
  site_key: string;
  kind: string;
  user_label: string | null;
  portal: string | null;
  path: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type ActivitySession = {
  sessionKey: string;
  user_label: string;
  site_key: string;
  portal: string | null;
  login_at: string;
  device: string;
  location: string;
  pages: Array<{ path: string; at: string; kind: string }>;
};

function metaStr(meta: Record<string, unknown> | null | undefined, key: string) {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function groupActivitySessions(rows: ActivityRow[]): ActivitySession[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const sessions: ActivitySession[] = [];
  const bySessionId = new Map<string, ActivitySession>();

  for (const row of sorted) {
    const sessionId = metaStr(row.meta, "session_id");
    const user = row.user_label?.trim() || "Unknown";

    if (sessionId && bySessionId.has(sessionId)) {
      const s = bySessionId.get(sessionId)!;
      pushEvent(s, row);
      continue;
    }

    if (row.kind === "LOGIN" || !sessionId) {
      const key = sessionId ?? `${row.site_key}:${user}:${row.created_at}`;
      const session: ActivitySession = {
        sessionKey: key,
        user_label: user,
        site_key: row.site_key,
        portal: row.portal,
        login_at: row.kind === "LOGIN" ? row.created_at : row.created_at,
        device: parseDevice(metaStr(row.meta, "user_agent")),
        location: metaStr(row.meta, "ip") ?? "—",
        pages: []
      };
      pushEvent(session, row);
      sessions.push(session);
      if (sessionId) bySessionId.set(sessionId, session);
      continue;
    }

    const last = sessions.filter((s) => s.user_label === user && s.site_key === row.site_key).at(-1);
    if (last) {
      pushEvent(last, row);
      if (sessionId) bySessionId.set(sessionId, last);
    }
  }

  return sessions.sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());
}

function pushEvent(session: ActivitySession, row: ActivityRow) {
  if (row.kind === "LOGIN") {
    session.login_at = row.created_at;
    session.portal = row.portal ?? session.portal;
    const ip = metaStr(row.meta, "ip");
    const ua = metaStr(row.meta, "user_agent");
    if (ip) session.location = ip;
    if (ua) session.device = parseDevice(ua);
    if (row.path) {
      session.pages.push({ path: row.path, at: row.created_at, kind: row.kind });
    }
    return;
  }

  if (row.path && (row.kind === "PAGE_VIEW" || row.kind === "HEARTBEAT")) {
    session.pages.push({
      path: row.path,
      at: row.created_at,
      kind: row.kind === "HEARTBEAT" ? "Active" : "Page"
    });
  }
}
