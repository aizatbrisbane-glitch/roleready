"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Eye, FileText, LayoutDashboard, Loader2, ScanSearch, PenLine } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { analytics } from "@/lib/analytics";
import { ErrorToast } from "@/components/ErrorToast";

const steps = [
  {
    icon: FileText,
    heading: "Tailor your resume",
    body: "Adapt your master resume to the requirements of each role without starting again from scratch.",
    tagline: "Less rewriting. More applying.",
  },
  {
    icon: ScanSearch,
    heading: "Check resume alignment",
    body: "Compare your resume with a job description and review relevant skills, terminology and keywords.",
    tagline: "See exactly where your resume fits — and where it doesn't.",
  },
  {
    icon: PenLine,
    heading: "Create your cover letter",
    body: "Generate a role-specific cover letter based on your experience and the position you are applying for.",
    tagline: "A cover letter that actually matches the role.",
  },
  {
    icon: Copy,
    heading: "One resume. Multiple applications.",
    body: "Keep your master resume in Koalapply and create tailored versions for different roles.",
    tagline: "Your source of truth, ready to adapt.",
  },
  {
    icon: LayoutDashboard,
    heading: "Track every application in one place",
    body: "Log the roles you've applied for, see where each one is up to and keep your materials organised alongside each application.",
    tagline: "No more losing track of what you sent where.",
  },
];

function SignupForm({ buttonLabel, prefillEmail = "" }: { buttonLabel: string; prefillEmail?: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setMessage("Password must be at least 8 characters and include letters and numbers.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Service unavailable. Please try again.");

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: fullName ? { full_name: fullName } : undefined,
        },
      });

      if (error) {
        throw new Error(
          error.message.toLowerCase().includes("password should")
            ? "Password must be at least 8 characters and include letters and numbers."
            : error.message
        );
      }

      if (data.session) {
        const userId = data.session.user.id;
        if (fullName) {
          fetch("/api/profile/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: fullName }),
          }).catch(() => {});
        }
        if (newsletterOptIn) {
          fetch("/api/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
            keepalive: true,
          }).catch(() => {});
        }
        fetch("/api/track/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "email" }),
        }).catch(() => {});
        analytics.signupComplete({ method: "email", source: analytics.getSignupSource(), userId });
        window.location.href = "/";
        return;
      }

      setDone(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-[#d4ccff] bg-[#ece8ff] px-6 py-8 text-center">
        <p className="text-lg font-bold text-[#2200ff]">Check your inbox!</p>
        <p className="mt-2 text-sm text-slate-600">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          autoComplete="given-name"
          placeholder="First name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#d4ccff]"
        />
        <input
          type="text"
          required
          autoComplete="family-name"
          placeholder="Last name *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#d4ccff]"
        />
      </div>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email address *"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#d4ccff]"
      />
      <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[#d4ccff]">
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Password *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="text-slate-400 transition hover:text-[#2200ff]"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <Eye className="h-5 w-5" />
        </button>
      </span>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-500">
        <input
          type="checkbox"
          checked={newsletterOptIn}
          onChange={(e) => setNewsletterOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2200ff] focus:ring-[#d4ccff]"
        />
        Get an extra free application credit — subscribe to career tips and job search advice (unsubscribe anytime)
      </label>
      <ErrorToast message={message} onDismiss={() => setMessage("")} />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(34,0,255,0.22)] transition hover:bg-[#1a00cc] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
        {loading ? "Setting up your account…" : buttonLabel}
      </button>
    </form>
  );
}

export default function ResumeToolsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* ── Nav ── */}
      <nav className="border-b border-slate-100 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/">
            <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-10 w-auto sm:h-12" />
          </Link>
          <Link href="/login" className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2200ff] hover:text-[#2200ff]">
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f5f3ff] via-white to-white px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#d4ccff]/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-violet-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4ccff] bg-[#ece8ff] px-4 py-1.5 text-sm font-semibold text-[#2200ff]">
            Free to get started
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Resume tools built for<br />
            <span className="text-[#2200ff]">every application.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Tailor your resume to a specific role, check how it aligns with the job description and create a matching cover letter — in one place.
          </p>
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-gradient-to-br from-[#f5f3ff] to-white p-8 text-left shadow-[0_8px_40px_rgba(34,0,255,0.08)] sm:p-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Try Koalapply free</h2>
            <p className="mt-4 leading-7 text-slate-600">No credit card required.</p>
            <div className="mt-8">
              <SignupForm buttonLabel="Try Koalapply free" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-14 text-center text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Your application toolkit, all in one place.
          </h2>
          <div className="space-y-14">
            {steps.map((step) => (
              <div key={step.heading} className="flex gap-6 sm:gap-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ece8ff] text-[#2200ff]">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{step.heading}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{step.body}</p>
                  <p className="mt-3 font-semibold text-[#2200ff]">{step.tagline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mid CTA banner ── */}
      <section className="bg-gradient-to-br from-[#2200ff] to-[#5533ff] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Upload once. Apply to more.
          </h2>
          <p className="mt-4 text-lg font-semibold text-violet-200">
            Upload → Tailor → Align → Apply
          </p>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-violet-100">
            Keep your master resume in Koalapply and prepare tailored application materials for each role without starting from scratch every time.
          </p>
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-gradient-to-br from-[#f5f3ff] to-white p-8 text-left shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:p-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Faster application prep. Less starting over.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Whether you&apos;re applying for one role or working through a shortlist, Koalapply helps you prepare each application properly without it taking over your day.
            </p>
            <div className="mt-8">
              <SignupForm buttonLabel="Get started free" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer strip ── */}
      <div className="border-t border-slate-100 px-5 py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Koalapply ·{" "}
        <a href="/privacy" className="hover:text-slate-600">Privacy</a> ·{" "}
        <a href="/terms" className="hover:text-slate-600">Terms</a>
      </div>
    </main>
  );
}
