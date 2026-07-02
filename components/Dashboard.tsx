"use client";

import { useCallback, useEffect, useState } from "react";
import ActivityDetailModal from "@/components/ActivityDetailModal";
import OutreachReportModal, { type OutreachRow } from "@/components/OutreachReportModal";
import {
  ActivityList,
  DayHourTable,
  EmptyState,
  formatIst,
  SiteCard,
  StatCard
} from "@/components/DashboardParts";

type SiteRow = { key: string; label: string; base_url: string };

type DetailView = {
  site: "kiet" | "demo" | "all";
  title: string;
  kind: "login" | "page" | "all";
};

type Stats = {
  sites: SiteRow[];
  activity: {
    total: number;
    bySite: Record<string, { logins: number; pageViews: number; events: number }>;
    dayHour: Record<string, number[]>;
    recent: Array<{
      site_key: string;
      kind: string;
      user_label: string | null;
      path: string | null;
      created_at: string;
    }>;
  };
  email: {
    sent: number;
    opened: number;
    notOpened: number;
    pending: number;
    failed: number;
    openRate: number;
    dayHourOpens: Record<string, number[]>;
    dayHourSends: Record<string, number[]>;
    recentOpens: Array<{
      name: string | null;
      email: string;
      institution: string | null;
      last_open_at: string | null;
      opened_at: string | null;
    }>;
  };
};

function kindLabel(kind: string) {
  if (kind === "LOGIN") return "Login";
  if (kind === "PAGE_VIEW") return "Page";
  if (kind === "HEARTBEAT") return "Active";
  return kind;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachRows, setOutreachRows] = useState<OutreachRow[]>([]);
  const [outreachSummary, setOutreachSummary] = useState({
    mail_opened: 0,
    demo_visited: 0,
    follow_up_sent: 0
  });
  const [outreachLoading, setOutreachLoading] = useState(false);

  const loadOutreach = useCallback(async () => {
    setOutreachLoading(true);
    try {
      const res = await fetch("/api/email/outreach-report");
      if (!res.ok) throw new Error("Failed to load outreach report");
      const data = await res.json();
      setOutreachRows(data.rows ?? []);
      setOutreachSummary(data.summary ?? { mail_opened: 0, demo_visited: 0, follow_up_sent: 0 });
    } catch {
      setOutreachRows([]);
    } finally {
      setOutreachLoading(false);
    }
  }, []);

  const openOutreach = useCallback(() => {
    setOutreachOpen(true);
    void loadOutreach();
  }, [loadOutreach]);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/stats?days=14");
      if (!res.ok) throw new Error("Failed to load");
      setStats(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  function openDetail(site: "kiet" | "demo" | "all", title: string, kind: "login" | "page" | "all" = "login") {
    setDetail({ site, title, kind });
  }

  if (loading && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const sites = stats.activity.bySite;
  const erpSites = (stats.sites ?? []).filter((s) => s.key === "kiet" || s.key === "demo");

  return (
    <div className="min-h-screen pb-8">
      <OutreachReportModal
        open={outreachOpen}
        onClose={() => setOutreachOpen(false)}
        rows={outreachRows}
        summary={outreachSummary}
        loading={outreachLoading}
      />
      <ActivityDetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        site={detail?.site ?? "all"}
        title={detail?.title ?? "Activity"}
        kind={detail?.kind ?? "login"}
      />

      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600">WorkflowTech</p>
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Activity Hub</h1>
            <p className="text-xs text-neutral-500 sm:text-sm">hub.workflowtech.info · Last 14 days</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline flex-1 sm:flex-none" type="button" onClick={() => void load()}>
              Refresh
            </button>
            <button className="btn-outline flex-1 sm:flex-none" type="button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6">
        <section>
          <h2 className="section-title">ERP sites</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {erpSites.map((site) => {
              const a = sites[site.key] ?? { logins: 0, pageViews: 0, events: 0 };
              const siteKey = site.key as "kiet" | "demo";
              return (
                <SiteCard
                  key={site.key}
                  label={site.label}
                  url={site.base_url}
                  logins={a.logins}
                  pageViews={a.pageViews}
                  connected={a.events > 0}
                  onLoginsClick={() => openDetail(siteKey, `${site.label} — logins`, "login")}
                  onPageViewsClick={() => openDetail(siteKey, `${site.label} — page views`, "page")}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="section-title">Summary</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="KIET logins"
              value={sites.kiet?.logins ?? 0}
              onClick={() => openDetail("kiet", "KIET ERP — logins today")}
            />
            <StatCard
              label="Demo logins"
              value={sites.demo?.logins ?? 0}
              onClick={() => openDetail("demo", "WFT Demo — logins today")}
            />
            <StatCard label="Emails sent" value={stats.email.sent} />
            <StatCard
              label="Open rate"
              value={`${stats.email.openRate}%`}
              hint={`${stats.email.opened} opened`}
            />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="section-title mb-0">Email</h2>
            <button type="button" className="btn-outline px-3 py-1.5 text-sm" onClick={() => openOutreach()}>
              Outreach report
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Opened" value={stats.email.opened} />
            <StatCard label="Not opened" value={stats.email.notOpened} />
            <StatCard label="Failed" value={stats.email.failed} />
          </div>
        </section>

        <DayHourTable title="Portal activity" subtitle="By day and hour (IST)" grid={stats.activity.dayHour} />
        <DayHourTable title="Emails sent" grid={stats.email.dayHourSends} />
        <DayHourTable title="Email opens" grid={stats.email.dayHourOpens} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ActivityList title="Recent activity" subtitle="KIET & demo ERP" empty="No activity yet">
            {stats.activity.recent.length === 0 ? (
              <EmptyState message="No activity yet" />
            ) : (
              <ul>
                {stats.activity.recent.map((r, i) => (
                  <li key={i} className="activity-row">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {r.user_label ?? "Unknown"} · <span className="text-neutral-500">{r.site_key}</span>
                      </p>
                      <p className="text-sm text-neutral-600">
                        {kindLabel(r.kind)}
                        {r.path ? ` · ${r.path}` : ""}
                      </p>
                    </div>
                    <time className="text-xs text-neutral-500">{formatIst(r.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </ActivityList>

          <ActivityList title="Email opens" subtitle="Outreach contacts" empty="No opens yet">
            {stats.email.recentOpens.length === 0 ? (
              <EmptyState message="No opens yet" />
            ) : (
              <ul>
                {stats.email.recentOpens.map((r, i) => (
                  <li key={i} className="activity-row">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">{r.name ?? r.email}</p>
                      <p className="truncate text-sm text-neutral-600">{r.email}</p>
                      {r.institution ? (
                        <p className="truncate text-xs text-neutral-500">{r.institution}</p>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-xs text-neutral-500">
                      {r.last_open_at || r.opened_at ? formatIst(r.last_open_at ?? r.opened_at!) : "—"}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </ActivityList>
        </div>
      </main>
    </div>
  );
}
