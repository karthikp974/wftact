"use client";

import { formatIst } from "@/components/DashboardParts";

export type OutreachRow = {
  id: string;
  name: string | null;
  email: string;
  institution: string | null;
  phone: string | null;
  opened_at: string | null;
  demo_visited: boolean;
  page_views: number;
  unique_pages: string[];
  minutes_spent: number;
  follow_up_sent_at: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  rows: OutreachRow[];
  summary: { mail_opened: number; demo_visited: number; follow_up_sent: number };
  loading: boolean;
};

export default function OutreachReportModal({ open, onClose, rows, summary, loading }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-neutral-200 bg-white shadow-xl sm:max-w-5xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Outreach report</h2>
            <p className="text-sm text-neutral-500">
              Opened mail: {summary.mail_opened} · Visited demo: {summary.demo_visited} · Follow up sent:{" "}
              {summary.follow_up_sent}
            </p>
          </div>
          <button type="button" className="btn-outline shrink-0 px-3 py-1.5 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? <p className="py-8 text-center text-neutral-500">Loading…</p> : null}
          {!loading && rows.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">No email opens yet</p>
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Campus</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Mail opened</th>
                    <th className="py-2 pr-3">Demo visited</th>
                    <th className="py-2 pr-3">Pages</th>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2">Follow up</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-neutral-900">{r.name ?? r.email}</p>
                        <p className="text-xs text-neutral-500">{r.email}</p>
                      </td>
                      <td className="max-w-[180px] py-3 pr-3 text-neutral-700">{r.institution ?? "—"}</td>
                      <td className="py-3 pr-3 whitespace-nowrap text-neutral-700">{r.phone ?? "—"}</td>
                      <td className="py-3 pr-3 text-xs text-neutral-600">
                        {r.opened_at ? formatIst(r.opened_at) : "—"}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={r.demo_visited ? "text-green-700" : "text-neutral-400"}>
                          {r.demo_visited ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-neutral-700">
                        {r.demo_visited ? (
                          <>
                            {r.page_views} views
                            {r.unique_pages.length > 0 ? (
                              <p className="mt-1 text-xs text-neutral-500">{r.unique_pages.slice(0, 3).join(", ")}</p>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-3 text-neutral-700">
                        {r.demo_visited ? `${r.minutes_spent} min` : "—"}
                      </td>
                      <td className="py-3 text-xs text-neutral-600">
                        {r.follow_up_sent_at ? formatIst(r.follow_up_sent_at) : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
