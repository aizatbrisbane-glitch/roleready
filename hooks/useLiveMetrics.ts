"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminMetrics, KoalapplyEvent } from "@/types/database";

export function useLiveMetrics(
  initialMetrics: AdminMetrics,
  initialEvents: KoalapplyEvent[]
) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [events, setEvents] = useState(initialEvents);
  const [latestEvent, setLatestEvent] = useState<KoalapplyEvent | null>(null);

  const refreshMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/metrics", { cache: "no-store" });
      if (res.ok) setMetrics(await res.json() as AdminMetrics);
    } catch {
      // non-critical
    }
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("koalapply-mission-control")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "koalapply_events" },
        (payload) => {
          const ev = payload.new as KoalapplyEvent;
          setEvents((prev) => [ev, ...prev].slice(0, 50));
          setLatestEvent(ev);
          void refreshMetrics();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshMetrics]);

  // Periodic refresh every 30 s
  useEffect(() => {
    const id = setInterval(refreshMetrics, 30_000);
    return () => clearInterval(id);
  }, [refreshMetrics]);

  return { metrics, events, latestEvent };
}
