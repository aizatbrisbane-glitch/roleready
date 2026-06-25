"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div
      className={`fixed left-1/2 top-5 z-50 w-full max-w-sm -translate-x-1/2 px-4 transition-all duration-300 ${
        message ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-red-500 px-4 py-3.5 text-sm text-white shadow-[0_8px_32px_rgba(239,68,68,0.35)]">
        <span className="flex-1 leading-5">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-0.5 shrink-0 text-white/70 transition hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
