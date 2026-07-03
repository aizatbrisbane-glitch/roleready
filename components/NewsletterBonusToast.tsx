"use client";

import { Mail, X } from "lucide-react";
import { useState } from "react";

type Props = {
  onSubscribe: () => void;
  onDismiss: () => void;
};

export function NewsletterBonusToast({ onSubscribe, onDismiss }: Props) {
  const [subscribing, setSubscribing] = useState(false);

  async function handleSubscribe() {
    setSubscribing(true);
    onSubscribe();
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)]">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ece8ff] text-[#2200ff]">
              <Mail className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-slate-900">Want an extra FREE application?</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-0.5 shrink-0 text-slate-400 transition hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 pl-10 text-xs leading-5 text-slate-500">
          Subscribe to career tips and unlock one more free application this month.
        </p>
        <div className="mt-3 flex gap-2 pl-10">
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={subscribing}
            className="rounded-full bg-[#2200ff] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a00cc] disabled:opacity-70"
          >
            {subscribing ? "Subscribing…" : "Click Subscribe!"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
