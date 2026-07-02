"use client";

import { useCallback, useEffect, useState } from "react";
import { formatIst } from "@/components/DashboardParts";
import { todayIstDate, type ActivitySession } from "@/lib/activity-utils";

type DetailResponse = {
  date: string;
  site: string;
  loginCount: number;
  pageViewCount: number;
  sessions: ActivitySession[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  site: "kiet" | "demo" | "all";
  title: string;
  kind?: "login" | "page" | "all";
};

export default function ActivityDetailModal({ open, onClose, site, title, kind = "login" }: Props) {
  const [date, setDate] = useState(todayIstDate());
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ site, date, kind });
      const res = await fetch(`/api/activity/detail?${q}`);
      if (!res.ok) throw new Error("Failed to load details");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [open, site, date, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-neutral-200 bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
            <p className="text-sm text-neutral-500">Who logged in, pages visited, device & IP</p>
          </div>
          <button type="button" className="btn-outline shrink-0 px-3 py-1.5 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-4 py-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Date (IST)
            <input
              type="date"
              className="input py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {data ? (
            <div className="flex gap-4 text-sm">
              <span>
                <strong>{data.loginCount}</strong> logins
              </span>
              <span>
                <strong>{data.pageViewCount}</strong> page views
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? <p className="py-8 text-center text-neutral-500">Loading…</p> : null}
          {error ? <p className="py-8 text-center text-red-600">{error}</p> : null}
          {!loading && !error && data?.sessions.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">No activity on this date</p>
          ) : null}

          <ul className="space-y-3 pb-4">
            {data?.sessions.map((s) => (
              <li key={s.sessionKey} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{s.user_label}</p>
                    <p className="text-sm text-neutral-600">
                      {s.site_key}
                      {s.portal ? ` · ${s.portal} portal` : ""}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">Login {formatIst(s.login_at)}</p>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase text-neutral-400">Device</dt>
                    <dd className="text-neutral-800">{s.device}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-neutral-400">Location (IP)</dt>
                    <dd className="break-all text-neutral-800">{s.location}</dd>
                  </div>
                </dl>

                {s.pages.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase text-neutral-400">Pages visited</p>
                    <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                      {s.pages.map((p, i) => (
                        <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span className="font-mono text-neutral-800">{p.path}</span>
                          <span className="shrink-0 text-xs text-neutral-500">
                            {p.kind} · {formatIst(p.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-neutral-500">No page views recorded yet</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
