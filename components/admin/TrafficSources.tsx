"use client";

import { useEffect, useState } from "react";

type Breakdown = { medium: string; campaign: string; count: number };
type SourceRow = { source: string; total: number; breakdowns: Breakdown[] };
type Data = { sources: SourceRow[]; total: number };

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

const SOURCE_COLORS: Record<string, string> = {
  google:    "bg-blue-500",
  facebook:  "bg-indigo-500",
  instagram: "bg-pink-500",
  tiktok:    "bg-slate-700",
  linkedin:  "bg-sky-600",
  email:     "bg-emerald-500",
  "(direct)": "bg-gray-400",
};

function barColor(source: string) {
  return SOURCE_COLORS[source.toLowerCase()] ?? "bg-violet-500";
}

export function TrafficSources() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/attribution")
      .then((r) => r.json())
      .then((d) => setData(d as Data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1">
        Signup Traffic Sources
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-400">
            Loading…
          </div>
        ) : !data || data.total === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-400">
            No attribution data yet — data will appear as new users sign up.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Total */}
            <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-semibold text-gray-500">
                {data.total} attributed signup{data.total !== 1 ? "s" : ""}
              </span>
            </div>

            {data.sources.map((row) => (
              <div key={row.source}>
                {/* Source row */}
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpanded(expanded === row.source ? null : row.source)}
                >
                  {/* Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800 capitalize">{row.source}</span>
                      <span className="text-xs font-mono text-gray-500 ml-2">
                        {row.total} <span className="text-gray-300">·</span> {pct(row.total, data.total)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(row.source)} transition-all`}
                        style={{ width: `${pct(row.total, data.total)}%` }}
                      />
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    className={`h-3.5 w-3.5 text-gray-300 shrink-0 transition-transform ${expanded === row.source ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Breakdown rows */}
                {expanded === row.source && (
                  <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
                    {row.breakdowns.map((b, i) => (
                      <div key={i} className="px-6 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs text-gray-600">
                            {b.medium !== "(none)" ? b.medium : <span className="text-gray-400">no medium</span>}
                          </span>
                          {b.campaign !== "(none)" && (
                            <span className="text-[11px] text-gray-400 ml-2">· {b.campaign}</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 shrink-0">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
