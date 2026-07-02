"use client";

import type { ReactNode } from "react";

type DayHour = Record<string, number[]>;

export function StatCard({
  label,
  value,
  hint,
  onClick
}: {
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1">{value}</div>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
      {onClick ? <p className="mt-2 text-xs font-medium text-blue-600">Tap for details →</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="panel w-full text-left transition hover:border-blue-300 hover:shadow-md" onClick={onClick}>
        {inner}
      </button>
    );
  }

  return <div className="panel">{inner}</div>;
}

export function SiteCard({
  label,
  url,
  logins,
  pageViews,
  connected,
  onLoginsClick,
  onPageViewsClick
}: {
  label: string;
  url: string;
  logins: number;
  pageViews: number;
  connected: boolean;
  onLoginsClick?: () => void;
  onPageViewsClick?: () => void;
}) {
  const host = url.replace(/^https?:\/\//, "");
  return (
    <div className="panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-neutral-900">{label}</h3>
          <a className="mt-0.5 block truncate text-sm text-blue-600" href={url} target="_blank" rel="noreferrer">
            {host}
          </a>
        </div>
        <span className={`badge w-fit ${connected ? "badge-ok" : "badge-off"}`}>
          {connected ? "Live" : "Waiting"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {onLoginsClick ? (
          <button
            type="button"
            className="rounded-lg bg-neutral-50 px-3 py-2.5 text-left ring-1 ring-neutral-200 transition hover:ring-blue-300"
            onClick={onLoginsClick}
          >
            <div className="text-xs text-neutral-500">Logins · tap</div>
            <div className="text-xl font-bold text-neutral-900">{logins}</div>
          </button>
        ) : (
          <div className="rounded-lg bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-200">
            <div className="text-xs text-neutral-500">Logins</div>
            <div className="text-xl font-bold text-neutral-900">{logins}</div>
          </div>
        )}
        {onPageViewsClick ? (
          <button
            type="button"
            className="rounded-lg bg-neutral-50 px-3 py-2.5 text-left ring-1 ring-neutral-200 transition hover:ring-blue-300"
            onClick={onPageViewsClick}
          >
            <div className="text-xs text-neutral-500">Page views · tap</div>
            <div className="text-xl font-bold text-neutral-900">{pageViews}</div>
          </button>
        ) : (
          <div className="rounded-lg bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-200">
            <div className="text-xs text-neutral-500">Page views</div>
            <div className="text-xl font-bold text-neutral-900">{pageViews}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Mobile-friendly daily totals when full heatmap is too wide */
export function DaySummary({ title, grid }: { title: string; grid: DayHour }) {
  const days = Object.keys(grid).sort().slice(-7);
  if (!days.length) {
    return (
      <div className="panel">
        <h3 className="font-semibold text-neutral-900">{title}</h3>
        <p className="mt-3 text-sm text-neutral-500">No data yet</p>
      </div>
    );
  }
  const totals = days.map((d) => ({
    day: d,
    total: (grid[d] ?? []).reduce((a, b) => a + b, 0)
  }));
  const max = Math.max(1, ...totals.map((t) => t.total));

  return (
    <div className="panel md:hidden">
      <h3 className="font-semibold text-neutral-900">{title}</h3>
      <p className="text-xs text-neutral-500">Last 7 days (IST)</p>
      <ul className="mt-3 space-y-2">
        {totals.map(({ day, total }) => (
          <li key={day} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-neutral-600">{day.slice(5)}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${(total / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-medium tabular-nums">{total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DayHourTable({ title, subtitle, grid }: { title: string; subtitle?: string; grid: DayHour }) {
  const days = Object.keys(grid).sort().slice(-7);
  const max = Math.max(1, ...days.flatMap((d) => grid[d] ?? []));

  return (
    <>
      <DaySummary title={title} grid={grid} />
      <div className="panel hidden md:block">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
        </div>
        {!days.length ? (
          <p className="py-6 text-center text-sm text-neutral-500">No data yet</p>
        ) : (
          <div className="table-wrap rounded-lg border border-neutral-200">
            <table className="data">
              <thead>
                <tr>
                  <th>Day</th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day}>
                    <td className="whitespace-nowrap font-medium">{day}</td>
                    {(grid[day] ?? Array(24).fill(0)).map((n, h) => {
                      const intensity = n / max;
                      const bg =
                        n === 0
                          ? "bg-neutral-100 text-transparent"
                          : intensity > 0.66
                            ? "bg-blue-600 text-white"
                            : intensity > 0.33
                              ? "bg-blue-400 text-white"
                              : "bg-blue-100 text-blue-900";
                      return (
                        <td key={h} className="p-0.5">
                          <div className={`heat-cell ${bg}`} title={`${n}`}>
                            {n || ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function ActivityList({
  title,
  subtitle,
  empty,
  children
}: {
  title: string;
  subtitle?: string;
  empty: string;
  children: ReactNode;
}) {
  return (
    <div className="panel">
      <h2 className="text-base font-semibold text-neutral-900 sm:text-lg">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p> : null}
      <div className="mt-3 max-h-[28rem] overflow-y-auto">{children}</div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-neutral-500">{message}</p>;
}

export function formatIst(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
