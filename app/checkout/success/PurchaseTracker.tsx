"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export function PurchaseTracker({ transactionId }: { transactionId: string }) {
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const verify = async () => {
      try {
        const response = await fetch("/api/analytics/purchase?session_id=" + encodeURIComponent(transactionId), { signal: controller.signal });
        if (!response.ok) return;
        const purchase = await response.json();
        if (cancelled || !purchase || purchase.transactionId !== transactionId) return;
        const key = "meta_purchase:" + transactionId;
        try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
        analytics.purchaseComplete(purchase);
      } catch { /* Tracking cannot affect the return page. */ }
      finally { clearTimeout(timer); }
    };
    void verify();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [transactionId]);
  return null;
}
