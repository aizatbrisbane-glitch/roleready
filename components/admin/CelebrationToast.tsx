"use client";

import { useEffect, useRef } from "react";
import type { KoalapplyEvent, KoalapplyEventType } from "@/types/database";

const TOAST_CONFIG: Partial<Record<KoalapplyEventType, { emoji: string; title: string }>> = {
  USER_SIGNUP:          { emoji: "🎉", title: "New user" },
  SUBSCRIPTION_STARTED: { emoji: "💳", title: "New subscriber!" },
};

interface CelebrationToastProps {
  event: KoalapplyEvent | null;
  visible: boolean;
}

export function CelebrationToast({ event, visible }: CelebrationToastProps) {
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!event || !visible) return;
    if (event.event_type !== "SUBSCRIPTION_STARTED") return;
    if (firedRef.current === event.id) return;
    firedRef.current = event.id;

    void import("canvas-confetti").then(({ default: confetti }) => {
      void confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#2200ff", "#c8ff00", "#a78bfa", "#ffffff", "#38bdf8"],
      });
    });
  }, [event, visible]);

  if (!event) return null;
  const config = TOAST_CONFIG[event.event_type];
  if (!config) return null;

  const firstName = event.metadata?.first_name;
  const message = firstName ? `${firstName} just ${event.event_type === "USER_SIGNUP" ? "joined" : "subscribed"}!` : null;

  return (
    <div
      className={[
        "fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl",
        "border border-gray-200 bg-white shadow-xl",
        "px-4 py-3 flex items-center gap-3",
        "transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
    >
      <span className="text-2xl select-none">{config.emoji}</span>
      <div>
        <div className="text-sm font-semibold text-gray-900">{config.title}</div>
        {message && (
          <div className="text-xs text-gray-500 mt-0.5">{message}</div>
        )}
      </div>
    </div>
  );
}
