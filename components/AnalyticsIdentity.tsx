"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { deferBrowserAnalytics } from "@/lib/analytics-browser";
import { captureGAIdentity } from "@/lib/analytics-identity";
import { GA_MEASUREMENT_ID, PRODUCTION_HOSTS } from "@/lib/analytics-policy";

export function AnalyticsIdentity({ enabled, userId }: { enabled: boolean; userId: string | null }) {
  const pathname = usePathname();
  useEffect(() => {
    window.koalapplyAnalyticsEnabled = enabled && PRODUCTION_HOSTS.includes(window.location.hostname);
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = !window.koalapplyAnalyticsEnabled;
    if (!window.koalapplyAnalyticsEnabled) {
      try { document.cookie = "koala_ga=; Path=/; Max-Age=0; SameSite=Lax; Secure"; } catch {}
      return;
    }
    deferBrowserAnalytics(() => window.gtag?.("config", GA_MEASUREMENT_ID, { user_id: userId, send_page_view: false }));
    let disposed = false;
    const refresh = async () => {
      try {
      const identity = await captureGAIdentity();
      if (!disposed && userId) {
        await fetch("/api/analytics/identity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity) }).catch(() => {});
      }
      } catch { /* Analytics SDK/storage failure must not escape the effect. */ }
    };
    // Retry after asynchronous gtag initialization, independently of first-touch storage.
    const timer = setTimeout(refresh, 1200);
    const interval = setInterval(refresh, 60_000);
    const focus = () => { void refresh(); };
    window.addEventListener("focus", focus);
    void refresh();
    return () => { disposed = true; clearTimeout(timer); clearInterval(interval); window.removeEventListener("focus", focus); };
  }, [enabled, userId, pathname]);
  return null;
}
