"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    heading: "Check your match score",
    body: 'Click the "Match Analysis" tab to see how well you fit the role.',
  },
  {
    heading: "Review missing keywords",
    body: 'Scroll down to "Opportunities to strengthen" â€” add any keywords that genuinely apply to your experience.',
  },
  {
    heading: "Review your documents",
    body: "Read through your tailored resume and cover letter in the tabs below.",
  },
  {
    heading: "Download your files",
    body: "Use the Download buttons above to get your DOCX files ready to submit.",
  },
  {
    heading: "Mark it Applied",
    body: 'Once submitted, change the status selector (top right) to "Applied" to track progress.',
  },
];

export function PostGenerationGuide({ applicationId, show }: { applicationId: string; show: boolean }) {
  const storageKey = `Koalapply_welcomed_${applicationId}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (localStorage.getItem(storageKey)) return;
    setVisible(true);
  }, [show, storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="rounded-[1.8rem] border border-[#d4ccff] bg-[#ece8ff]/40 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2200ff]">What&apos;s next</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Your application is ready â€” here&apos;s what to do</h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-[#2200ff] transition hover:text-[#1a00cc]"
        >
          Got it <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}
