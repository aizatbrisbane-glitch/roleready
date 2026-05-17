"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Paste a link. Done.",
    body: "Drop in any job ad URL and JobPilot fetches the full description automatically — even from SEEK.",
  },
  {
    icon: Sparkles,
    title: "AI-tailored documents",
    body: "Claude or GPT rewrites your master resume and cover letter to match each specific role in under a minute.",
  },
  {
    icon: Search,
    title: "Grab matching jobs",
    body: "Search Australian job boards instantly and get AI-ranked matches against your resume — all in one click.",
  },
  {
    icon: TrendingUp,
    title: "Track your pipeline",
    body: "Move applications through New → Applied → Interview and always know where every role stands.",
  },
  {
    icon: FileText,
    title: "Download DOCX & PDF",
    body: "Export professional Word and PDF documents ready to attach to any application portal.",
  },
  {
    icon: CheckCircle2,
    title: "Match scoring",
    body: "Every application gets a 0–100 match score and a list of missing keywords so you know your odds.",
  },
];

const steps = [
  {
    n: "1",
    title: "Upload your master resume",
    body: "Add your best, most complete resume once. JobPilot uses it as the foundation for every tailored application.",
  },
  {
    n: "2",
    title: "Find or paste a job ad",
    body: "Paste a job URL or click Grab to auto-search and score matching Australian roles against your profile.",
  },
  {
    n: "3",
    title: "Generate tailored documents",
    body: "AI rewrites your resume and cover letter to match the job ad — no invented details, just smart emphasis.",
  },
  {
    n: "4",
    title: "Download and apply",
    body: "Export DOCX or PDF and attach directly to the application. Track the status right here as you go.",
  },
];

export function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-slate-900 px-4 pb-24 pt-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-400">
            <BriefcaseBusiness className="h-4 w-4" />
            AI-powered job applications
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Land your next role,{" "}
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              faster.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            Paste a job link and JobPilot generates a tailored resume and cover letter in seconds — powered by Claude AI and built around your master resume.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-400"
            >
              <Sparkles className="h-5 w-5" />
              Get started free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-stone-200">
          {[
            { value: "< 60s", label: "To generate tailored docs" },
            { value: "SEEK + more", label: "Australian job boards" },
            { value: "DOCX & PDF", label: "Export formats" },
          ].map(({ value, label }) => (
            <div key={label} className="px-3 py-6 text-center sm:px-8 sm:py-8">
              <p className="text-lg font-bold text-teal-700 sm:text-2xl">{value}</p>
              <p className="mt-1 text-xs text-stone-500 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="bg-stone-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900">
              Everything you need to apply smarter
            </h2>
            <p className="mt-3 text-stone-500">
              Stop rewriting your resume for every job. Let the AI do the heavy lifting.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                  <Icon className="h-5 w-5 text-teal-600" />
                </div>
                <h3 className="font-semibold text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900">How it works</h2>
            <p className="mt-3 text-stone-500">Four steps from job ad to ready-to-send application.</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ n, title, body }) => (
              <div key={n} className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {n}
                </div>
                <h3 className="font-semibold text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-slate-900 px-4 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold text-white">Ready to apply smarter?</h2>
          <p className="mt-4 text-slate-400">
            Create your account and start generating tailored applications today.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-400"
          >
            <Sparkles className="h-5 w-5" />
            Get started — it&apos;s free
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-white px-4 py-6 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-stone-400">
          <BriefcaseBusiness className="h-4 w-4 text-teal-600" />
          <span className="font-semibold text-stone-600">JobPilot</span>
          <span>· Built with Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
