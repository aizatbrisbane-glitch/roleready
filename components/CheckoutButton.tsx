"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { EntitlementPlanType } from "@/types/database";

type Props = {
  planType: Exclude<EntitlementPlanType, "free" | "enterprise_90_day">;
  label: string;
  highlighted?: boolean;
};

export function CheckoutButton({ planType, label, highlighted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Unable to start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-70 ${
          highlighted
            ? "bg-[#2200ff] text-white shadow-[0_12px_28px_rgba(34,0,255,0.22)] hover:-translate-y-0.5 hover:bg-[#1a00cc]"
            : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300"
        }`}
      >
        {loading ? "Redirecting…" : label}
        {!loading && <ArrowRight className="h-3.5 w-3.5" />}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
