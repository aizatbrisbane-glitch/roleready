"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export function PurchaseTracker({
  plan,
  valueAudCents,
  transactionId,
}: {
  plan: string;
  valueAudCents: number;
  transactionId: string;
}) {
  useEffect(() => {
    analytics.purchaseComplete({
      plan,
      value: valueAudCents / 100,
      currency: "AUD",
      transactionId,
    });
  }, [plan, valueAudCents, transactionId]);

  return null;
}
