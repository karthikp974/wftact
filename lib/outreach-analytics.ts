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
  minutesSpent: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
};

export function outreachIdFromMeta(meta: Record<string, unknown> | null | undefined) {
  const id = meta?.outreach_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function computeDemoEngagement(
  events: ActivityEventRow[],
  outreachId: string
): DemoEngagement {
  const rows = events
    .filter((e) => outreachIdFromMeta(e.meta) === outreachId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (!rows.length) {
    return {
      visited: false,
      pageViews: 0,
      uniquePages: [],
      minutesSpent: 0,
      firstVisitAt: null,
      lastVisitAt: null
    };
  }

  const paths = new Set<string>();
  let pageViews = 0;
  for (const row of rows) {
    if (row.kind === "PAGE_VIEW" || row.kind === "LOGIN") {
      pageViews += 1;
      if (row.path) paths.add(row.path);
    }
  }

  const first = rows[0]!.created_at;
  const last = rows[rows.length - 1]!.created_at;
  const ms = new Date(last).getTime() - new Date(first).getTime();
  const minutesSpent = Math.max(1, Math.round(ms / 60_000));

  return {
    visited: true,
    pageViews,
    uniquePages: [...paths],
    minutesSpent,
    firstVisitAt: first,
    lastVisitAt: last
  };
}
