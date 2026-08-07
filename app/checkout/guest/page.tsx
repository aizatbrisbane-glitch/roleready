"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function GuestCheckoutPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current || !plan) return;
    called.current = true;

    let attribution: Record<string, string> = {};
    try {
      const stored = localStorage.getItem("koala_attr");
      if (stored) attribution = JSON.parse(stored);
    } catch { /* ignore */ }

    // Use authenticated checkout for logged-in users so we can lock their email at Stripe
    const supabase = createSupabaseBrowserClient();
    const doCheckout = supabase
      ? supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            return fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planType: plan }),
            });
          }
          return fetch("/api/checkout/guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planType: plan, attribution }),
          });
        })
      : fetch("/api/checkout/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType: plan, attribution }),
        });

    doCheckout
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error ?? "Unable to start checkout. Please try again.");
        }
      })
      .catch(() => setError("Unable to start checkout. Please try again."));
  }, [plan]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="mx-auto max-w-md rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-[0_32px_80px_rgba(34,0,255,0.08)]">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href="/pricing"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
          >
            Back to pricing
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="mx-auto max-w-md rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-[0_32px_80px_rgba(34,0,255,0.08)]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#d4ccff] border-t-[#2200ff]" />
        <p className="mt-6 text-sm font-semibold text-slate-700">Setting up your checkout...</p>
      </div>
    </main>
  );
}
