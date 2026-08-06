"use client";

import { useEffect } from "react";

const LS_KEY = "koala_attr";

function getCookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : undefined;
}

export function AttributionCapture({ isAuthenticated }: { isAuthenticated: boolean }) {
  useEffect(() => {
    try {
      // First-touch guard — never overwrite if already stored
      if (localStorage.getItem(LS_KEY)) {
        // Already have attribution stored. If user just authenticated, push it to the server.
        if (isAuthenticated) {
          const stored = localStorage.getItem(LS_KEY);
          if (stored) pushToServer(JSON.parse(stored));
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const gaCookie = getCookie("_ga");
      const fbclid = params.get("fbclid");

      const attr = {
        source:       params.get("utm_source")   ?? undefined,
        medium:       params.get("utm_medium")   ?? undefined,
        campaign:     params.get("utm_campaign") ?? undefined,
        content:      params.get("utm_content")  ?? undefined,
        term:         params.get("utm_term")     ?? undefined,
        referrer:     document.referrer || undefined,
        landing_page: window.location.pathname + (window.location.search || ""),
        // Store raw _ga value — server's parseGa4ClientId() handles stripping the prefix
        ga_client_id: gaCookie ?? undefined,
        fbp:          getCookie("_fbp"),
        fbc:          getCookie("_fbc") ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined),
      };

      const hasData = Object.values(attr).some(Boolean);
      if (!hasData) return;

      localStorage.setItem(LS_KEY, JSON.stringify(attr));

      if (isAuthenticated) pushToServer(attr);
    } catch {
      // localStorage may be blocked in some environments — never throw
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function pushToServer(attr: Record<string, string | undefined>) {
  fetch("/api/attribution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attr),
  }).catch(() => {});
}
