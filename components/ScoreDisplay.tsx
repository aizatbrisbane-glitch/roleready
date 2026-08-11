"use client";

import { useEffect, useState } from "react";

export const SCORE_UPDATE_EVENT = "koala:score-update";

function scoreTone(score: number | null) {
  if (score === null) return { label: "Match pending", className: "text-slate-500", pill: "bg-slate-100 text-slate-600" };
  if (score >= 85) return { label: "Strong match", className: "text-[#2200ff]", pill: "bg-[#d4ccff] text-[#1a00cc]" };
  if (score >= 70) return { label: "Good match", className: "text-amber-600", pill: "bg-amber-100 text-amber-700" };
  if (score >= 50) return { label: "Worth reviewing", className: "text-violet-600", pill: "bg-violet-100 text-violet-700" };
  return { label: "Needs tailoring", className: "text-rose-600", pill: "bg-rose-50 text-rose-600" };
}

type Props = {
  initialScore: number | null;
};

export function ScoreDisplay({ initialScore }: Props) {
  const [score, setScore] = useState(initialScore);
  const tone = scoreTone(score);

  // Sync when server re-renders with a real score (e.g. after generation completes
  // and router.refresh() fires — useState(initialScore) only captures the mount value).
  useEffect(() => {
    if (initialScore !== null) setScore(initialScore);
  }, [initialScore]);

  useEffect(() => {
    function handler(e: Event) {
      const newScore = (e as CustomEvent<number>).detail;
      setScore(newScore);
    }
    window.addEventListener(SCORE_UPDATE_EVENT, handler);
    return () => window.removeEventListener(SCORE_UPDATE_EVENT, handler);
  }, []);

  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-5xl font-bold tabular-nums ${tone.className}`}>
        {score === null ? "—" : `${score}%`}
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.pill}`}>{tone.label}</span>
    </div>
  );
}
