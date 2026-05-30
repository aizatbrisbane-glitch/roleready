"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Play,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UploadCloud,
  Zap,
} from "lucide-react";

const steps = [
  {
    icon: UploadCloud,
    title: "Upload your master resume",
    body: "Add your best version once.",
    color: "bg-[#ece8ff] text-[#2200ff]",
    badge: "bg-[#d4ccff] text-[#1a00cc]",
  },
  {
    icon: Search,
    title: "Find or paste a job ad",
    body: "Use a role you love.",
    color: "bg-rose-50 text-rose-600",
    badge: "bg-rose-100 text-rose-800",
  },
  {
    icon: Sparkles,
    title: "AI tailors your documents",
    body: "Resume and cover letter, matched.",
    color: "bg-violet-50 text-violet-600",
    badge: "bg-violet-100 text-violet-800",
  },
  {
    icon: Download,
    title: "Download & apply",
    body: "Export, send, and track.",
    color: "bg-amber-50 text-amber-700",
    badge: "bg-amber-100 text-amber-900",
  },
];

const trustLabels = [
  { name: "Google",            color: "#4285F4" },
  { name: "Canva",             color: "#7B2CF9" },
  { name: "Atlassian",         color: "#0052CC" },
  { name: "Commonwealth Bank", color: "#B8860B" },
  { name: "seek",              color: "#0D3880" },
  { name: "airbnb",            color: "#FF5A5F" },
];

const stats = [
  { icon: FileText,   value: "23",  label: "Applications",  period: "This week",  iconCls: "bg-[#ece8ff] text-[#2200ff]"    },
  { icon: Briefcase,  value: "4",   label: "Interviews",    period: "This month", iconCls: "bg-emerald-50 text-emerald-600" },
  { icon: Star,       value: "1",   label: "Offer",         period: "This month", iconCls: "bg-amber-50 text-amber-500"     },
  { icon: TrendingUp, value: "28%", label: "Response Rate", period: "This month", iconCls: "bg-violet-50 text-violet-600"   },
];

function ImageFallback({ className }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#d4ccff_0,#d4ccff_18%,transparent_19%),radial-gradient(circle_at_70%_35%,#ece8ff_0,#ece8ff_20%,transparent_21%),linear-gradient(135deg,#ece8ff,#f0eeff_48%,#f8fafc)] ${className ?? ""}`}
    />
  );
}

function LimeSwoop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 32" className={`h-7 w-auto fill-none ${className ?? ""}`} aria-hidden>
      <circle cx="18" cy="22" r="5" stroke="#c8ff00" strokeWidth="2.5" />
      <path d="M 23 22 C 60 8 140 4 270 16" stroke="#c8ff00" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <style jsx global>{`
        html { scroll-behavior: smooth; }

        @keyframes applyhq-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes applyhq-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .applyhq-fade-up  { animation: applyhq-fade-up 760ms ease-out both; }
        .applyhq-float    { animation: applyhq-float 5.5s ease-in-out infinite; }
        .applyhq-float-2  { animation: applyhq-float 6.5s ease-in-out infinite 0.8s; }
        .applyhq-float-3  { animation: applyhq-float 7s ease-in-out infinite 1.6s; }
      `}</style>

      {/* ── Header ── */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="inline-flex items-center">
          <img src="/brand/applyhq-logo-indigo.svg" alt="ApplyHQ" className="h-12 w-auto sm:h-14" />
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium text-slate-600 md:flex">
          <a href="#how-it-works" className="transition hover:text-[#2200ff]">How it works</a>
          <a href="#features"     className="transition hover:text-[#2200ff]">Features</a>
          <a href="#pricing"      className="transition hover:text-[#2200ff]">Pricing</a>
          <a href="#blog"         className="transition hover:text-[#2200ff]">Blog</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-slate-600 transition hover:text-[#2200ff]"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2200ff] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:min-h-11 sm:px-6"
          >
            <span className="sm:hidden">Start free</span>
            <span className="hidden sm:inline">Get started free</span>
          </Link>
        </div>
      </header>

      <main>

        {/* ── Hero ── */}
        <section className="applyhq-fade-up relative overflow-hidden" style={{ minHeight: 680, background: "#f5f3f0" }}>

          {/* Photo — right 60%, no gradient fade, subject fills the panel */}
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-[60%] md:block">
            <img
              src="/landing/hero-job-seeker.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            {/* Soft left blend into the warm-gray background */}
            <div className="absolute inset-y-0 left-0 w-[30%] bg-gradient-to-r from-[#f5f3f0] to-transparent" />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f5f3f0] to-transparent" />
          </div>

          {/* Left content */}
          <div className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 lg:px-10 lg:pt-20 lg:pb-32">
            <div className="max-w-[500px]">

              {/* Headline */}
              <h1 className="text-6xl font-black leading-[1.0] tracking-tight text-slate-900 sm:text-7xl lg:text-8xl">
                Land your<br />next role
                <span className="block text-[#2200ff]">faster.</span>
              </h1>

              {/* Subheading */}
              <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Track applications. Tailor every submission.<br className="hidden sm:block" />
                Prepare for interviews. Stay organised and get more offers.
              </p>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_28px_rgba(34,0,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
                >
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <Play className="h-4 w-4 fill-slate-600 text-slate-600" />
                  Watch Demo
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-500">
                {["Free forever", "No credit card", "Cancel anytime"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {t}
                  </span>
                ))}
              </div>

            </div>
          </div>

          {/* Floating cards — matching the reference image positions */}

          {/* Card: Application Sent — top-centre (woman's upper-left shoulder) */}
          <div className="applyhq-float absolute hidden w-52 rounded-2xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.13)] md:block" style={{ top: "14%", left: "42%" }}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </span>
              <span className="text-sm font-bold text-slate-900">Application Sent</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-600">Acme Corp</p>
            <p className="mt-0.5 text-xs text-slate-400">2 days ago</p>
          </div>

          {/* Card: Interview Booked — top-right */}
          <div className="applyhq-float-2 absolute right-6 hidden w-60 rounded-2xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.13)] md:block lg:right-10" style={{ top: "12%" }}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ece8ff]">
                <Calendar className="h-5 w-5 text-[#2200ff]" />
              </span>
              <span className="text-sm font-bold text-slate-900">Interview Booked</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Tue, 14 May · 10:00 AM</p>
            <p className="mt-0.5 text-xs text-slate-500">Product Manager</p>
            <a href="/login" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2200ff] hover:underline">
              View details <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          {/* Card: Offer Received — bottom-right */}
          <div className="applyhq-float-3 absolute right-6 hidden w-52 rounded-2xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.13)] md:block lg:right-10" style={{ bottom: "18%" }}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </span>
              <span className="text-sm font-bold text-slate-900">Offer Received!</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-600">Senior Analyst</p>
            <p className="mt-0.5 text-xs text-slate-400">3 days ago</p>
          </div>

        </section>

        {/* ── Trusted by ── */}
        <section className="applyhq-fade-up mx-auto mt-20 max-w-5xl px-5 pb-4 sm:px-8 lg:px-10">
          <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-[0.18em]">
            Trusted by job seekers at
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {trustLabels.map(({ name, color }) => (
              <span key={name} className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color }}>
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="applyhq-fade-up mx-auto mt-12 max-w-4xl px-5 pb-20 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map(({ icon: Icon, value, label, period, iconCls }) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconCls}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">{label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{period}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="applyhq-fade-up bg-white px-5 py-28 sm:px-8 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex justify-center">
              <LimeSwoop />
            </div>
            <h2 className="mx-auto max-w-3xl text-center text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              A calmer way to send stronger applications
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-slate-600">
              Bring your resume, choose a role, and let ApplyHQ help shape the next version with care.
            </p>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, body, color, badge }, index) => (
                <div key={title} className="relative rounded-[1.75rem] border border-slate-100 bg-white px-5 py-7 text-center transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(34,0,255,0.07)]">
                  <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] ${color} shadow-[0_20px_55px_rgba(34,0,255,0.07)]`}>
                    <Icon className="h-9 w-9" />
                  </div>
                  <div className={`mx-auto mt-5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${badge}`}>
                    {index + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-snug text-slate-900">{title}</h3>
                  <p className="mx-auto mt-4 max-w-48 text-base leading-7 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Electric blue CTA band ── */}
        <section className="applyhq-fade-up bg-[#2200ff] px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <LimeSwoop className="mx-auto mb-6" />
            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Ready to land your next role?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/80">
              Join thousands of job seekers who apply smarter, track better and get hired faster.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c8ff00] px-8 py-4 text-base font-bold text-slate-900 shadow-[0_12px_32px_rgba(200,255,0,0.35)] transition hover:-translate-y-0.5 hover:bg-[#d4ff33]"
              >
                Start free today <ArrowRight className="h-5 w-5" />
              </Link>
              <span className="text-sm font-medium text-white/70">No credit card required</span>
            </div>
          </div>
        </section>

        {/* ── Pricing / CTA ── */}
        <section id="pricing" className="applyhq-fade-up bg-slate-50 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#ece8ff]/80 via-white to-[#d4ccff]/40 shadow-[0_30px_100px_rgba(34,0,255,0.08)] md:grid-cols-[0.95fr_1.05fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Apply smarter.
                <span className="block text-[#2200ff]">Get better results.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-700">
                Save time, stay organised and send stronger applications.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-8 py-4 text-base font-semibold text-white shadow-[0_22px_55px_rgba(34,0,255,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#1a00cc] hover:shadow-[0_28px_65px_rgba(34,0,255,0.28)]"
                >
                  Get started free <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-sm font-medium text-slate-600">No credit card required</p>
              </div>
            </div>
            <div className="relative min-h-[280px] md:mr-8 md:min-h-[410px] lg:mr-12">
              <ImageFallback className="opacity-80" />
              <img
                src="/landing/team-laptop.jpg"
                alt="People reviewing an application together on a laptop"
                className="absolute inset-0 h-full w-full object-cover object-center shadow-[0_24px_80px_rgba(20,33,61,0.1)] md:rounded-[2rem]"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          </div>
        </section>

        <div id="blog" className="sr-only" />
      </main>
    </div>
  );
}
