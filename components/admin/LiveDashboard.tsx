"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveMetrics } from "@/hooks/useLiveMetrics";
import { MetricCard } from "./MetricCard";
import { UsageStats } from "./UsageStats";
import { LiveFeed } from "./LiveFeed";
import { CelebrationToast } from "./CelebrationToast";
import { DetailPanel, type PanelConfig } from "./DetailPanel";
import { ChartsRow } from "./ChartsRow";
import type { AdminMetrics, KoalapplyEvent, KoalapplyEventType } from "@/types/database";

interface LiveDashboardProps {
  initialMetrics: AdminMetrics;
  initialEvents: KoalapplyEvent[];
}

function formatClock(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LiveDashboard({ initialMetrics, initialEvents }: LiveDashboardProps) {
  const { metrics, events, latestEvent } = useLiveMetrics(initialMetrics, initialEvents);

  // Live clock — initialise after mount to avoid SSR/client hydration mismatch
  const [clock, setClock] = useState("");
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(formatClock(now));
      setDateStr(formatDate(now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Light background override
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#f8fafc";
    return () => { document.body.style.background = prev; };
  }, []);

  // Celebration toast
  const [showToast, setShowToast] = useState(false);
  const [toastEvent, setToastEvent] = useState<KoalapplyEvent | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!latestEvent) return;
    if (!["USER_SIGNUP", "SUBSCRIPTION_STARTED"].includes(latestEvent.event_type)) return;

    clearTimeout(toastTimer.current);
    setToastEvent(latestEvent);
    setShowToast(true);
    toastTimer.current = setTimeout(() => setShowToast(false), 4500);
  }, [latestEvent]);

  // Detail panel
  const [panel, setPanel] = useState<PanelConfig>(null);
  const openUsers = useCallback((filter: "all" | "today" | "week" | "paid", title: string) => {
    setPanel({ kind: "users", filter, title });
  }, []);
  const openEvents = useCallback((type: KoalapplyEventType, title: string) => {
    setPanel({ kind: "events", type, title });
  }, []);

  const mrr = parseFloat(metrics.revenue.mrr);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col select-none">

      {/* ── Header ── */}
      <header className="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-5 sm:px-7 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/brand/koalapply-favicon-wordmark.png"
            alt="Koalapply"
            className="h-8 w-auto"
          />
          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            Mission Control
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* LIVE indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-gray-500">{clock}</div>
            <div className="text-[10px] text-gray-400">{dateStr}</div>
          </div>
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-4">

        {/* Row 1: Users (left, wide) + Revenue (right, narrow) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Users */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1">
              Users
            </div>
            <div className="grid grid-cols-3 gap-3 flex-1">
              <MetricCard
                label="Total Users"
                value={metrics.users.total}
                large
                centered
                className="h-full"
                onClick={() => openUsers("all", "All Users")}
              />
              <MetricCard
                label="New Today"
                value={metrics.users.today}
                accent="green"
                large
                centered
                className="h-full"
                onClick={() => openUsers("today", "New Today")}
              />
              <MetricCard
                label="This Week"
                value={metrics.users.thisWeek}
                large
                centered
                className="h-full"
                onClick={() => openUsers("week", "New This Week")}
              />
            </div>
          </div>

          {/* Revenue */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1">
              Revenue
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <MetricCard
                label="Paid Subscribers"
                value={metrics.revenue.paidSubscribers}
                accent="amber"
                onClick={() => openUsers("paid", "Paid Subscribers")}
              />
              <MetricCard
                label="Conversion"
                value={`${metrics.revenue.conversionRate}%`}
                onClick={() => openUsers("paid", "Paid Subscribers")}
              />
              <MetricCard
                label="Est. MRR"
                value={mrr > 0 ? `$${metrics.revenue.mrr}` : "—"}
                subLabel={mrr === 0 ? "Set PLAN_PRICE_* env vars" : undefined}
                accent="amber"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Charts */}
        <ChartsRow />

        {/* Row 3: Usage */}
        <UsageStats
          usage={metrics.usage}
          onCardClick={(type) => openEvents(type, type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()))}
        />

        {/* Row 3: Live feed */}
        <LiveFeed
          events={events}
          latestEventId={latestEvent?.id ?? null}
        />
      </div>

      {/* Detail panel */}
      <DetailPanel config={panel} onClose={() => setPanel(null)} />

      {/* Celebration toast */}
      <CelebrationToast event={toastEvent} visible={showToast} />
    </div>
  );
}
