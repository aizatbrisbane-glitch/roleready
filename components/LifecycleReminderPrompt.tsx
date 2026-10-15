"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Shown to Group B users: signed up without ticking the newsletter checkbox,
// and have not yet opted in or dismissed lifecycle reminder emails.
//
// Server-side visibility logic (app/page.tsx) only renders this component when
// the preference state is KNOWN to be "no preference recorded". A failed
// email_preferences lookup suppresses the prompt at the server level.
//
// Post-render responsibilities:
//   • "Yes, remind me"  → POST /api/lifecycle/consent { action: "opt_in" }
//     On success: hide the prompt (router.refresh re-evaluates server state).
//     On failure: show inline error, keep prompt visible for retry.
//   • "Not now"        → POST /api/lifecycle/consent { action: "dismiss" }
//     On success: hide the prompt.
//     On failure: show inline error, keep prompt visible for retry.
//
// A POST failure must never close the prompt as though consent was recorded.

export function LifecycleReminderPrompt() {
  const router = useRouter();
  const [loading, setLoading] = useState<"opt_in" | "dismiss" | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "opt_in" | "dismiss") {
    setLoading(action);
    setError(null);

    try {
      const res = await fetch("/api/lifecycle/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? `Request failed (${res.status}). Please try again.`;
        setError(msg);
        setLoading(null);
        return;
      }

      // Success — hide prompt and refresh server-rendered state.
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(null);
    }
  }

  if (done) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#2200ff]/20 bg-[#ece8ff] px-5 py-4">
      <div className="flex items-start gap-3 sm:items-center">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2200ff]/10 sm:mt-0">
          <Bell className="h-4 w-4 text-[#2200ff]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Want a reminder to use your free application?</p>
          <p className="text-xs leading-5 text-slate-600">We&apos;ll send you one or two helpful nudges if you haven&apos;t used it yet. No spam — unsubscribe anytime.</p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => respond("opt_in")}
          disabled={loading !== null}
          className="rounded-full bg-[#2200ff] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_rgba(34,0,255,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-70"
        >
          {loading === "opt_in" ? "Saving…" : "Yes, remind me"}
        </button>
        <button
          type="button"
          onClick={() => respond("dismiss")}
          disabled={loading !== null}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-70"
        >
          {loading === "dismiss" ? "Saving…" : "Not now"}
        </button>
      </div>
    </div>
  );
}
