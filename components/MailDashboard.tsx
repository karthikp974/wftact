"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatIst } from "@/components/DashboardParts";
import type { MailRow } from "@/lib/outreach-analytics";

type TabKey =
  | "all_sent"
  | "opened_no_demo"
  | "opened_with_demo"
  | "not_opened"
  | "follow_up_not_opened";

type DashboardData = {
  date: string | null;
  available_dates: string[];
  counts: Record<TabKey, number>;
  segments: Record<TabKey, MailRow[]>;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "all_sent", label: "All sent" },
  { key: "not_opened", label: "Not opened" },
  { key: "opened_no_demo", label: "Opened, no demo" },
  { key: "opened_with_demo", label: "Opened + demo" },
  { key: "follow_up_not_opened", label: "Follow up not opened" }
];

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function formatTimeLeft(sec: number | null) {
  if (sec == null) return "—";
  if (sec <= 0) return "Due now";
  return formatDuration(sec) + " left";
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-medium uppercase text-neutral-500">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2 align-top text-sm text-neutral-800 ${className}`}>{children}</td>;
}

function PersonCell({ row }: { row: MailRow }) {
  return (
    <div>
      <p className="font-medium text-neutral-900">{row.name ?? row.email}</p>
      <p className="text-xs text-neutral-500">{row.email}</p>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[900px] text-left">{children}</table>
    </div>
  );
}

function AllSentTable({ rows }: { rows: MailRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-neutral-500">No mails sent on this date</p>;
  return (
    <TableWrap>
      <thead className="border-b border-neutral-200 bg-neutral-50">
        <tr>
          <Th>#</Th>
          <Th>Name</Th>
          <Th>Phone</Th>
          <Th>College</Th>
          <Th>Sent (IST)</Th>
          <Th>Opened</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-100">
            <Td>{r.mail_no}</Td>
            <Td><PersonCell row={r} /></Td>
            <Td>{r.phone ?? "—"}</Td>
            <Td className="max-w-[200px]">{r.institution ?? "—"}</Td>
            <Td>{r.sent_at ? formatIst(r.sent_at) : "—"}</Td>
            <Td>{r.mail_opened ? `Yes · ${formatIst(r.first_opened_at!)}` : "No"}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function NotOpenedTable({ rows }: { rows: MailRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-neutral-500">No records</p>;
  return (
    <TableWrap>
      <thead className="border-b border-neutral-200 bg-neutral-50">
        <tr>
          <Th>#</Th>
          <Th>Name</Th>
          <Th>Phone</Th>
          <Th>College</Th>
          <Th>Mail sent (IST)</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-100">
            <Td>{r.mail_no}</Td>
            <Td><PersonCell row={r} /></Td>
            <Td>{r.phone ?? "—"}</Td>
            <Td className="max-w-[200px]">{r.institution ?? "—"}</Td>
            <Td>{r.sent_at ? formatIst(r.sent_at) : "—"}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function OpenedNoDemoTable({ rows }: { rows: MailRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-neutral-500">No records</p>;
  return (
    <TableWrap>
      <thead className="border-b border-neutral-200 bg-neutral-50">
        <tr>
          <Th>#</Th>
          <Th>Name</Th>
          <Th>College</Th>
          <Th>Mail sent</Th>
          <Th>Mail opened</Th>
          <Th>Follow up sent</Th>
          <Th>Follow up opened</Th>
          <Th>Result</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-100">
            <Td>{r.mail_no}</Td>
            <Td><PersonCell row={r} /></Td>
            <Td className="max-w-[180px]">{r.institution ?? "—"}</Td>
            <Td>{r.sent_at ? formatIst(r.sent_at) : "—"}</Td>
            <Td>{r.first_opened_at ? formatIst(r.first_opened_at) : "—"}</Td>
            <Td>{r.follow_up_sent_at ? formatIst(r.follow_up_sent_at) : formatTimeLeft(r.follow_up_time_left_sec)}</Td>
            <Td>{r.follow_up_opened ? formatIst(r.follow_up_last_open_at!) : "No"}</Td>
            <Td className="text-xs">{r.engagement_label}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function OpenedDemoTable({ rows }: { rows: MailRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-neutral-500">No records</p>;
  return (
    <TableWrap>
      <thead className="border-b border-neutral-200 bg-neutral-50">
        <tr>
          <Th>#</Th>
          <Th>Name</Th>
          <Th>Phone</Th>
          <Th>College</Th>
          <Th>Pages visited</Th>
          <Th>Time on demo</Th>
          <Th>Follow up</Th>
          <Th>Follow up opened</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-100">
            <Td>{r.mail_no}</Td>
            <Td><PersonCell row={r} /></Td>
            <Td>{r.phone ?? "—"}</Td>
            <Td className="max-w-[160px]">{r.institution ?? "—"}</Td>
            <Td>
              <p>{r.page_views} page views</p>
              <p className="mt-1 text-xs text-neutral-500">{r.unique_pages.join(", ") || "—"}</p>
            </Td>
            <Td>
              <p>{formatDuration(r.seconds_spent)}</p>
              <p className="text-xs text-neutral-500">
                {r.demo_first_at ? formatIst(r.demo_first_at) : "—"} → {r.demo_last_at ? formatIst(r.demo_last_at) : "—"}
              </p>
            </Td>
            <Td>{r.follow_up_sent_at ? formatIst(r.follow_up_sent_at) : formatTimeLeft(r.follow_up_time_left_sec)}</Td>
            <Td>{r.follow_up_opened ? formatIst(r.follow_up_last_open_at!) : "No"}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function FollowUpNotOpenedTable({ rows }: { rows: MailRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-neutral-500">No records</p>;
  return (
    <TableWrap>
      <thead className="border-b border-neutral-200 bg-neutral-50">
        <tr>
          <Th>#</Th>
          <Th>Name</Th>
          <Th>Phone</Th>
          <Th>College</Th>
          <Th>Follow up sent</Th>
          <Th>Follow up opened</Th>
          <Th>Demo after follow up</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-100">
            <Td>{r.mail_no}</Td>
            <Td><PersonCell row={r} /></Td>
            <Td>{r.phone ?? "—"}</Td>
            <Td className="max-w-[180px]">{r.institution ?? "—"}</Td>
            <Td>{r.follow_up_sent_at ? formatIst(r.follow_up_sent_at) : "—"}</Td>
            <Td>No</Td>
            <Td>{r.post_follow_up_demo ? "Yes" : "No"}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

export default function MailDashboard() {
  const [tab, setTab] = useState<TabKey>("all_sent");
  const [date, setDate] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/email/mail-dashboard${q}`);
      if (!res.ok) throw new Error("Failed");
      setData((await res.json()) as DashboardData);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!date && data?.available_dates[0]) {
      setDate(data.available_dates[0]);
    }
  }, [data?.available_dates, date]);

  useEffect(() => {
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const rows = data?.segments[tab] ?? [];

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600">WorkflowTech</p>
            <h1 className="text-xl font-bold text-neutral-900">Mail dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="btn-outline px-3 py-1.5 text-sm">
              Activity hub
            </Link>
            <button type="button" className="btn-outline px-3 py-1.5 text-sm" onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Send date (IST)
            <select className="input py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="">All dates</option>
              {(data?.available_dates ?? []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {data ? (
            <p className="text-sm text-neutral-600">
              Sent: {data.counts.all_sent} · Opened no demo: {data.counts.opened_no_demo} · Opened + demo:{" "}
              {data.counts.opened_with_demo} · Not opened: {data.counts.not_opened}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.key ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label} ({data?.counts[t.key] ?? 0})
            </button>
          ))}
        </div>

        {loading ? <p className="py-12 text-center text-neutral-500">Loading…</p> : null}
        {!loading && tab === "all_sent" ? <AllSentTable rows={rows} /> : null}
        {!loading && tab === "not_opened" ? <NotOpenedTable rows={rows} /> : null}
        {!loading && tab === "opened_no_demo" ? <OpenedNoDemoTable rows={rows} /> : null}
        {!loading && tab === "opened_with_demo" ? <OpenedDemoTable rows={rows} /> : null}
        {!loading && tab === "follow_up_not_opened" ? <FollowUpNotOpenedTable rows={rows} /> : null}
      </main>
    </div>
  );
}
