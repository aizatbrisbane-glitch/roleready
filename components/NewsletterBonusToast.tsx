"use client";

import { Gift, X } from "lucide-react";
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
    <div className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-[#2200ff] p-5 shadow-[0_20px_60px_rgba(34,0,255,0.45)]">
        {/* dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 text-white/50 transition hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* icon + heading */}
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Gift className="h-5 w-5 text-white" />
          </span>
          <p className="text-base font-bold leading-tight text-white pr-4">
            Want an extra FREE application?
          </p>
        </div>

        {/* body */}
        <p className="mt-3 text-sm leading-6 text-white/80">
          Subscribe to career tips and we'll unlock a 2nd free application for you right now.
        </p>

        {/* actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={subscribing}
            className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#2200ff] shadow-sm transition hover:bg-[#ece8ff] disabled:opacity-70"
          >
            {subscribing ? "Subscribing…" : "Click Subscribe!"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
