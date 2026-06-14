"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { blogArticles } from "@/lib/blog";
import { PublicFooter } from "@/components/PublicFooter";
import {
  HOMEPAGE_ONBOARDING_DRAFT_KEY,
  HomepageOnboardingModal,
  type StoredDraft,
} from "@/components/landing/HomepageOnboardingModal";
import {
  ArrowRight,
  Briefcase,
  Download,
  FileText,
  Search,
  ShieldCheck,
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
    body: "Once. That's it. We store it, you forget about it.",
    color: "bg-[#ece8ff] text-[#2200ff]",
    badge: "bg-[#d4ccff] text-[#1a00cc]",
  },
  {
    icon: Search,
    title: "Find or paste a job ad",
    body: "Drop in a URL or paste the ad. Job done.",
    color: "bg-rose-50 text-rose-600",
    badge: "bg-rose-100 text-rose-800",
  },
  {
    icon: Sparkles,
    title: "AI tailors your documents",
    body: "Your resume and cover letter, rewritten to match — in seconds.",
    color: "bg-violet-50 text-violet-600",
    badge: "bg-violet-100 text-violet-800",
  },
  {
    icon: Download,
    title: "Download & apply",
    body: "Export, hit send, and track every application in one place.",
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

const landingArticles = blogArticles.slice(0, 3);

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
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [heroResumeFile, setHeroResumeFile] = useState<File | null>(null);
  const [storedDraft, setStoredDraft] = useState<StoredDraft | null>(null);
  const [onboardingMessage, setOnboardingMessage] = useState("");
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  const heroImages = [
    "/landing/hero-celebration.png",
    "/landing/hero-job-seeker.png",
    "/landing/slide-2.png",
    "/landing/slide-3.png",
    "/landing/slide-4.png",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((i) => (i + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");
    if (!errorCode && !errorDescription) return;

    if (errorCode === "otp_expired" || errorDescription?.toLowerCase().includes("expired")) {
      const rawDraft = window.localStorage.getItem(HOMEPAGE_ONBOARDING_DRAFT_KEY);
      if (rawDraft) {
        try {
          setStoredDraft(JSON.parse(rawDraft) as StoredDraft);
        } catch {
          window.localStorage.removeItem(HOMEPAGE_ONBOARDING_DRAFT_KEY);
        }
      }
      setOnboardingMessage("That confirmation link expired or was already used. Re-upload your resume and continue to send a fresh confirmation email.");
      setOnboardingOpen(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  function startOnboarding(file?: File | null) {
    if (file) setHeroResumeFile(file);
    if (file) setStoredDraft(null);
    setOnboardingMessage("");
    setOnboardingOpen(true);
  }

  function handleHeroFile(file?: File | null) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("File is too large. Please upload a PDF or DOCX under 4 MB.");
      return;
    }
    startOnboarding(file);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <style jsx global>{`
        html { scroll-behavior: smooth; }

        @keyframes Koalapply-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes Koalapply-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes Koalapply-pop-in {
          0% { opacity: 0; transform: translateY(16px) scale(0.94); }
          70% { opacity: 1; transform: translateY(-3px) scale(1.015); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .Koalapply-fade-up  { animation: Koalapply-fade-up 760ms ease-out both; }
        .Koalapply-float    { animation: Koalapply-float 5.5s ease-in-out infinite; }
        .Koalapply-float-2  { animation: Koalapply-float 6.5s ease-in-out infinite 0.8s; }
        .Koalapply-float-3  { animation: Koalapply-float 7s ease-in-out infinite 1.6s; }
        .Koalapply-pop-in   { animation: Koalapply-pop-in 620ms cubic-bezier(.2,.9,.2,1) 260ms both; }
        @media (prefers-reduced-motion: reduce) {
          .Koalapply-fade-up,
          .Koalapply-float,
          .Koalapply-float-2,
          .Koalapply-float-3,
          .Koalapply-pop-in {
            animation: none !important;
          }
        }
      `}</style>

      <main>

        {/* â"€â"€ Hero (header lives inside so nav overlays the image) â"€â"€ */}
        <section className="Koalapply-fade-up relative overflow-hidden" style={{ background: "#f5f3f0" }}>

          {/* Nav overlay — sits on top of the photo background */}
          <header className="absolute inset-x-0 top-0 z-20">
            <div className="flex items-center justify-between px-8 py-6 sm:px-12 lg:px-16">
              <Link href="/" className="inline-flex items-center">
                <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-28 w-auto sm:h-36" />
              </Link>

              <nav className="hidden items-center gap-9 text-sm font-medium text-slate-700 md:flex">
                <a href="#how-it-works" className="transition hover:text-[#2200ff]">How it works</a>
                <a href="#features"     className="transition hover:text-[#2200ff]">Features</a>
                <Link href="/pricing"   className="transition hover:text-[#2200ff]">Pricing</Link>
                <Link href="/blog"      className="transition hover:text-[#2200ff]">Blog</Link>
              </nav>

              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2200ff] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:min-h-11 sm:px-6"
                >
                  Login
                </Link>
              </div>
            </div>
          </header>

          {/* Full-width content — top padding clears the overlaid nav */}
          <div className="relative z-10 px-8 pb-10 pt-24 sm:px-12 sm:pb-16 sm:pt-32 lg:px-16 lg:pt-36 lg:pb-24">

            {/* Headline — spans full width */}
            <h1 className="text-center text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl">
              You don't have to suffer. <span className="text-[#2200ff]">Tailor your CV and cover letter to any job.</span>
            </h1>

            {/* Subheading */}
            <p className="mt-5 text-center text-2xl font-semibold leading-snug text-slate-600 sm:text-3xl">
              Turn one CV into a tailored application for every job. Take seconds, not hours.
            </p>

            {/* Two-column: photo left, resume card right */}
            <div className="mt-7 grid grid-cols-1 gap-6 pb-4 sm:mt-10 lg:grid-cols-2 lg:gap-10">

              {/* Left: slideshow */}
              <div className="relative hidden overflow-hidden rounded-3xl shadow-lg lg:block" style={{ minHeight: "420px" }}>
                {heroImages.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-1000"
                    style={{ opacity: i === heroImageIndex ? 1 : 0 }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ))}
                {/* TikTok-style overlay text */}
                <p className="absolute top-5 left-5 right-5 text-center text-xl font-black leading-tight tracking-tight text-black">
                  <span className="box-decoration-clone bg-white px-2 py-1 leading-[1.7]">
                    POV: you not rewriting CVs and Covers manually 😌
                  </span>
                </p>
                {/* Slideshow dots */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {heroImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroImageIndex(i)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: i === heroImageIndex ? "20px" : "6px", background: i === heroImageIndex ? "white" : "rgba(255,255,255,0.5)" }}
                    />
                  ))}
                </div>
              </div>

              {/* Right: big resume upload card */}
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleHeroFile(event.dataTransfer.files?.[0]);
                }}
                className="Koalapply-pop-in flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-[#b9adff] bg-white/95 p-6 text-center shadow-[0_28px_90px_rgba(34,0,255,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#2200ff] sm:rounded-[2.25rem] sm:p-12"
              >
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(event) => handleHeroFile(event.target.files?.[0])}
                />
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-[#ece8ff] text-[#2200ff] shadow-sm sm:h-24 sm:w-24 sm:rounded-[1.7rem]">
                  <UploadCloud className="h-9 w-9 sm:h-14 sm:w-14" />
                </span>
                <p className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:mt-6 sm:text-4xl">Drop your resume here. See what it could look like.</p>
                <p className="mt-3 text-base font-semibold text-slate-500">PDF or DOCX · Max 4 MB</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    resumeInputRef.current?.click();
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-base font-bold text-white shadow-[0_16px_44px_rgba(34,0,255,0.34)] transition hover:bg-[#1a00cc] sm:mt-8 sm:px-7 sm:py-4 sm:text-lg"
                >
                  Tailor My Resume for FREE
                </button>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 sm:mt-3 sm:text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  No credit card required
                </p>
              </div>

            </div>
          </div>


        </section>

        {/* â"€â"€ Trusted by â"€â"€ */}
        <section className="Koalapply-fade-up mx-auto mt-20 max-w-5xl px-5 pb-4 sm:px-8 lg:px-10">
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

        {/* â"€â"€ Stats â"€â"€ */}
        <section className="Koalapply-fade-up mx-auto mt-12 max-w-4xl px-5 pb-20 sm:px-8 lg:px-10">
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

        {/* â"€â"€ How it works â"€â"€ */}
        <section id="how-it-works" className="Koalapply-fade-up bg-white px-5 py-28 sm:px-8 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex justify-center">
              <LimeSwoop />
            </div>
            <h2 className="mx-auto max-w-3xl text-center text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Four steps. More interviews.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-slate-600">
              Upload your resume once. We do the tailoring. You do the interviewing.
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

        {/* â"€â"€ Electric blue CTA band â"€â"€ */}
        <section id="blog" className="Koalapply-fade-up bg-slate-50 px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff]">
                  Career resources
                </p>
                <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                  Career advice & insights
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Practical guidance for resumes, interviews, applications and career moves.
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(34,0,255,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:w-auto"
              >
                View all articles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {landingArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className="group overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(34,0,255,0.08)]"
                >
                  <div className="aspect-[16/10] bg-slate-50">
                    <img src={article.image} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                      <span className="rounded-full bg-[#ece8ff] px-2.5 py-1 text-[#2200ff]">{article.category}</span>
                      <span>{article.readingTime}</span>
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-xl font-black leading-snug text-slate-900 transition group-hover:text-[#2200ff]">
                      {article.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="Koalapply-fade-up bg-[#2200ff] px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            {/* Emoji decorations — brand brief style */}
            <div className="mb-6 flex items-center justify-center gap-6">
              <span className="inline-block -rotate-12 text-4xl" aria-hidden="true">🤞</span>
              <LimeSwoop />
              <span className="inline-block rotate-12 text-4xl" aria-hidden="true">⚡</span>
            </div>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Stop applying. Start landing.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/80">
              Smart job seekers use Koalapply to apply better, track everything, and actually hear back. Your turn.
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

        {/* â"€â"€ Pricing / CTA â"€â"€ */}
        <section id="pricing" className="Koalapply-fade-up bg-slate-50 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#ece8ff]/80 via-white to-[#d4ccff]/40 shadow-[0_30px_100px_rgba(34,0,255,0.08)] md:grid-cols-[0.95fr_1.05fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Apply smarter.
                <span className="block text-[#2200ff]">Get the offer.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-700">
                Free to start. No credit card. No excuses. Just more interviews.
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

      </main>
      <PublicFooter />
      <HomepageOnboardingModal
        open={onboardingOpen}
        initialResumeFile={heroResumeFile}
        initialDraft={storedDraft}
        initialMessage={onboardingMessage}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  );
}
