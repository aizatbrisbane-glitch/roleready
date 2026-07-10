"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const startRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = startRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * ease));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

interface MetricCardProps {
  label: string;
  value: number | string;
  subLabel?: string;
  accent?: "default" | "green" | "amber" | "purple";
  large?: boolean;
  centered?: boolean;
  onClick?: () => void;
  className?: string;
}

const accentMap = {
  default: "text-gray-900",
  green:   "text-emerald-600",
  amber:   "text-amber-500",
  purple:  "text-violet-600",
};

export function MetricCard({ label, value, subLabel, accent = "default", large = false, centered = false, onClick, className = "" }: MetricCardProps) {
  const isNum = typeof value === "number";
  const animated = useCountUp(isNum ? value : 0);
  const displayValue = isNum ? animated.toLocaleString() : value;

  const [flash, setFlash] = useState(false);
  const prevVal = useRef(value);
  useEffect(() => {
    if (prevVal.current !== value) {
      prevVal.current = value;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(id);
    }
  }, [value]);

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl border bg-white p-5 transition-all duration-300 shadow-sm",
        flash ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:bg-gray-50",
        onClick ? "cursor-pointer hover:border-gray-300 active:scale-[0.98]" : "",
        centered ? "flex flex-col items-center justify-center text-center" : "",
        className,
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
        {label}
      </div>
      <div
        className={[
          "font-mono font-bold tabular-nums",
          large ? "text-6xl" : "text-2xl sm:text-3xl",
          accentMap[accent],
        ].join(" ")}
      >
        {displayValue}
      </div>
      {subLabel && (
        <div className="mt-1 text-[11px] text-gray-400">{subLabel}</div>
      )}
    </Tag>
  );
}
