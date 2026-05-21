"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ArrowRight } from "lucide-react";

type Step = {
  label: string;
  description: string;
  href: string;
  done: boolean;
};

type Props = {
  hasResume: boolean;
  hasApplication: boolean;
  hasGeneratedDoc: boolean;
};

const DISMISS_KEY = "onboarding_checklist_dismissed";

export function OnboardingChecklist({ hasResume, hasApplication, hasGeneratedDoc }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  const allDone = hasResume && hasApplication && hasGeneratedDoc;

  if (dismissed || allDone) return null;

  const steps: Step[] = [
    {
      label: "Upload your master resume",
      description: "This is the source of truth for all your tailored applications.",
      href: "/documents",
      done: hasResume,
    },
    {
      label: "Add your first job",
      description: "Paste a job URL or ad text to create an application.",
      href: "/#quick-apply",
      done: hasApplication,
    },
    {
      label: "Generate tailored documents",
      description: "Let AI tailor your resume and cover letter to the role.",
      href: hasApplication ? "/applications" : "/documents",
      done: hasGeneratedDoc,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-white/85 p-5 shadow-[0_20px_70px_rgba(20,33,61,0.07)] backdrop-blur md:p-7">
      <button
        onClick={dismiss}
        type="button"
        aria-label="Dismiss checklist"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-5 pr-8">
        <h2 className="text-xl font-semibold text-[#14213d]">Get started with ApplyHQ</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {completedCount} of {steps.length} steps complete
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#0f9f92] transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i}>
            {step.done ? (
              <div className="flex items-start gap-3 rounded-2xl bg-teal-50/60 px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0f9f92]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0f9f92] line-through decoration-[#0f9f92]/40">{step.label}</p>
                </div>
              </div>
            ) : (
              <Link
                href={step.href}
                className="group flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 transition hover:bg-[#f0faf9]"
              >
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-[#0f9f92]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#14213d]">{step.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.description}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#0f9f92]" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
