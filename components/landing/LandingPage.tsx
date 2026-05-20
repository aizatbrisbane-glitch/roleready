"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDot,
  Download,
  FileText,
  Gauge,
  Search,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";

const proofChips = [
  { icon: Zap, label: "Tailored in under 60s" },
  { icon: CircleDot, label: "AI Match Score" },
  { icon: FileText, label: "DOCX & PDF export" },
  { icon: Check, label: "Track your progress" },
];

const steps = [
  {
    icon: UploadCloud,
    title: "Upload your master resume",
    body: "Add your best version once.",
    color: "bg-teal-50 text-teal-700",
    badge: "bg-teal-100 text-teal-800",
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

const trustLabels = ["SEEK", "Indeed", "LinkedIn", "Glassdoor", "Jora"];

function ImageFallback({ className }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#fde68a_0,#fde68a_18%,transparent_19%),radial-gradient(circle_at_70%_35%,#99f6e4_0,#99f6e4_20%,transparent_21%),linear-gradient(135deg,#fff7ed,#f0fdfa_48%,#fdf2f8)] ${className ?? ""}`}
    />
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf4] text-[#14213d]">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes applyhq-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes applyhq-fade-up {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .applyhq-fade-up {
          animation: applyhq-fade-up 760ms ease-out both;
        }

        .applyhq-float {
          animation: applyhq-float 5.5s ease-in-out infinite;
        }
      `}</style>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="inline-flex items-center">
          <img src="/brand/applyhq-logo-transparent.png" alt="ApplyHQ" className="h-12 w-auto mix-blend-multiply sm:h-14" />
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium text-slate-700 md:flex">
          <a href="#how-it-works" className="transition hover:text-[#0f9f92]">
            How it works
          </a>
          <a href="#features" className="transition hover:text-[#0f9f92]">
            Features
          </a>
          <a href="#pricing" className="transition hover:text-[#0f9f92]">
            Pricing
          </a>
          <a href="#blog" className="transition hover:text-[#0f9f92]">
            Blog
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/70 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-[#0f9f92]"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#0f9f92] px-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,159,146,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b8f83] sm:min-h-12 sm:px-6"
          >
            <span className="sm:hidden">Start free</span>
            <span className="hidden sm:inline">Get started free</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-14 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:gap-16 lg:px-10 lg:pb-32 lg:pt-24">
          <div className="pointer-events-none absolute left-0 top-24 h-80 w-80 rounded-full bg-teal-100/45 blur-3xl" />
          <div className="pointer-events-none absolute bottom-16 right-12 h-96 w-96 rounded-full bg-rose-100/60 blur-3xl" />
          <div className="pointer-events-none absolute left-[42%] top-24 hidden text-5xl font-serif italic text-[#ff9d8d]/45 md:block">
            ~
          </div>

          <div className="applyhq-fade-up relative z-10 max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f9f92] shadow-[0_12px_36px_rgba(20,33,61,0.06)]">
              <Sparkles className="h-4 w-4" />
              AI-powered job applications
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.12] tracking-tight text-[#14213d] sm:text-6xl lg:text-[5.35rem]">
              Your dream job is out there.
              <span className="mt-5 block">
                We&apos;ll help you{" "}
                <span className="relative inline-block font-serif italic font-normal text-[#0f9f92]">
                  get it
                  <span className="absolute -bottom-2 left-1 h-1.5 w-[92%] rounded-full bg-[#ff9d8d]" />
                </span>
                .
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-lg leading-9 text-slate-600 sm:text-xl sm:leading-10">
              Tailored resumes, cover letters and match scores in seconds - so you can apply smarter and land interviews faster.
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-8 py-4 text-base font-semibold text-white shadow-[0_22px_55px_rgba(15,159,146,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#0b8f83] hover:shadow-[0_28px_65px_rgba(15,159,146,0.28)]"
              >
                Get started free <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full bg-white/75 px-8 py-4 text-base font-semibold text-[#14213d] shadow-[0_14px_38px_rgba(20,33,61,0.07)] transition duration-300 hover:-translate-y-1 hover:text-[#0f9f92] hover:shadow-[0_20px_48px_rgba(20,33,61,0.09)]"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="applyhq-fade-up relative min-h-[500px] [animation-delay:120ms] md:-mr-12 md:min-h-[700px] lg:-mr-28">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-teal-100/65 via-white/20 to-rose-100/75 blur-2xl" />
            <ImageFallback className="rounded-[2.75rem] opacity-70" />
            <img
              src="/landing/job-seeker-laptop.jpg"
              alt="Smiling job seeker with a coffee beside a laptop"
              className="absolute inset-0 h-full w-full rounded-[3rem] object-cover object-center shadow-[0_36px_110px_rgba(20,33,61,0.14)]"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 rounded-b-[3rem] bg-gradient-to-t from-[#fffaf4] via-[#fffaf4]/60 to-transparent" />
            <div className="pointer-events-none absolute right-8 top-12 hidden text-6xl font-serif italic text-teal-200/80 sm:block">
              //
            </div>

            <div className="applyhq-float absolute -bottom-4 left-4 w-52 rounded-[2.25rem] bg-white/92 p-6 shadow-[0_30px_90px_rgba(20,33,61,0.16)] backdrop-blur-xl sm:bottom-14 sm:left-8 sm:w-60 md:-left-8">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-base font-medium text-slate-700">Match Score</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92]">
                  <Gauge className="h-5 w-5" />
                </span>
              </div>
              <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-[conic-gradient(#0f9f92_0_82%,#d7f4ef_82%_100%)] shadow-inner">
                <div className="flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full bg-white text-4xl font-extrabold text-[#14213d]">
                  92%
                </div>
              </div>
              <p className="mt-5 text-center text-base font-medium text-slate-700">Excellent match!</p>
            </div>
          </div>
        </section>

        <section id="features" className="applyhq-fade-up mx-auto max-w-6xl px-5 pb-24 sm:px-8 lg:px-10">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-5">
            {proofChips.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-full bg-white/60 px-4 py-3 shadow-[0_12px_34px_rgba(20,33,61,0.05)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/85 hover:shadow-[0_18px_46px_rgba(20,33,61,0.08)]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium leading-snug text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="applyhq-fade-up bg-[#fffaf4] px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Trusted by job seekers across Australia</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {trustLabels.map((label) => (
                <span key={label} className="text-xl font-extrabold tracking-tight text-slate-300 sm:text-2xl">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="applyhq-fade-up bg-[#fff7ef] px-5 py-28 sm:px-8 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-6xl">
            <h2 className="mx-auto max-w-3xl text-center text-4xl font-extrabold leading-tight tracking-tight text-[#14213d] sm:text-5xl">
              A calmer way to send stronger applications
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-slate-600">
              Bring your resume, choose a role, and let ApplyHQ help shape the next version with care.
            </p>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, body, color, badge }, index) => (
                <div key={title} className="relative rounded-[1.75rem] bg-white/45 px-5 py-7 text-center transition duration-300 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_18px_55px_rgba(20,33,61,0.06)]">
                  <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] ${color} shadow-[0_20px_55px_rgba(20,33,61,0.07)]`}>
                    <Icon className="h-9 w-9" />
                  </div>
                  <div className={`mx-auto mt-5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${badge}`}>
                    {index + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-snug text-[#14213d]">{title}</h3>
                  <p className="mx-auto mt-4 max-w-48 text-base leading-7 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="applyhq-fade-up bg-[#fffaf4] px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#e8fbf7] via-white to-[#fff0ea] shadow-[0_30px_100px_rgba(20,33,61,0.07)] md:grid-cols-[0.95fr_1.05fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-[#14213d] sm:text-5xl">
                Apply smarter.
                <span className="block text-[#0f9f92]">Get better results.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-700">
                Save time, stay organised and send stronger applications.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-8 py-4 text-base font-semibold text-white shadow-[0_22px_55px_rgba(15,159,146,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#0b8f83] hover:shadow-[0_28px_65px_rgba(15,159,146,0.28)]"
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
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        </section>

        <div id="blog" className="sr-only" />
      </main>
    </div>
  );
}
