"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const STEPS = [
  {
    heading: "Fix missing keywords",
    body: "Add keywords from the left panel that genuinely reflect your experience.",
  },
  {
    heading: "Review your documents",
    body: "Read through your tailored resume and cover letter in the tabs below.",
  },
  {
    heading: "Download your documents",
    body: "Use the Download buttons to get your DOCX files, then submit directly on the employer's site.",
  },
  {
    heading: "Mark as applied",
    body: 'Change the status selector (top right) to "Applied" to track your progress.',
  },
];

export function PostGenerationGuide({ applicationId, show }: { applicationId: string; show: boolean }) {
  const storageKey = `Koalapply_guide_collapsed_${applicationId}`;
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(storageKey) === "1");
    setMounted(true);
  }, [storageKey]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
  }

  if (!show || !mounted) return null;

  return (
    <section className="rounded-[1.8rem] border border-[#d4ccff] bg-[#ece8ff]/40 p-5 md:p-6">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2200ff]">What&apos;s next</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Finish your application</h2>
        </div>
        <span className="mt-1 shrink-0 text-[#2200ff]">
          {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.heading} className="rounded-2xl bg-white/70 px-4 py-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2200ff] text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{step.heading}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{step.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
