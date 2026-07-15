import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AtsChecker } from "@/components/tools/AtsChecker";
import { BlogResumeCTA } from "@/components/blog/BlogResumeCTA";
import { NewsletterSignup } from "@/components/blog/NewsletterSignup";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Free ATS Resume Checker for Australian Job Seekers | Koalapply",
  description:
    "Check your resume against a job description in seconds. See your keyword match score and what's missing before you apply.",
};

const whatAtsChecks = [
  "Keyword overlap between your resume and the job description",
  "Clean formatting that the system can actually parse — tables, columns, text boxes and graphics often break this",
  "Section headings that match expected structure (Experience, Education, Skills)",
  "Consistent terminology between your resume and your LinkedIn profile, in systems that cross-reference both",
];

const lowScoreSteps = [
  "Check for missing keywords first. If the job description repeatedly uses terms your resume doesn't include, add them where genuinely accurate — don't invent experience you don't have.",
  "Simplify formatting. Remove tables, columns, headers and footers with contact info, and any graphics or icons.",
  "Match section headings to standard terms: Experience, Education, Skills — rather than creative alternatives.",
  "Re-run the check after edits to confirm the change actually improved your match.",
];

const faqs = [
  {
    q: "Is this ATS checker really free?",
    a: "Yes — you can check your resume against a job description with no signup required.",
  },
  {
    q: "Which ATS systems does this check against?",
    a: "The checker is based on the core parsing and keyword-matching logic shared across the major platforms used in Australia, including PageUp, JobAdder and Workday, rather than any single vendor's exact algorithm.",
  },
  {
    q: "Does a perfect ATS score guarantee an interview?",
    a: "No. It means your resume will reliably surface to a human reviewer. What happens after that depends on the strength of your experience and how clearly it's communicated.",
  },
  {
    q: "Should I stuff my resume with keywords to get a higher score?",
    a: "No. Keyword stuffing that doesn't reflect genuine experience tends to read poorly to the human reviewer who sees your resume next, and can hurt more than it helps.",
  },
];

export default async function AtsCheckerPage() {
  const supabase = isSupabaseConfigured() ? await createSupabaseServerClient() : null;
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {!user && (
        <header className="border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/brand/koalapply-logo.png"
                alt="Koalapply"
                width={168}
                height={56}
                className="h-12 w-auto sm:h-14"
                priority
              />
            </Link>

            <nav className="hidden items-center gap-9 text-sm font-medium text-slate-700 md:flex">
              <Link href="/#how-it-works" className="transition hover:text-[#2200ff]">How it works</Link>
              <Link href="/#features" className="transition hover:text-[#2200ff]">Features</Link>
              <Link href="/pricing" className="transition hover:text-[#2200ff]">Pricing</Link>
              <Link href="/blog" className="transition hover:text-[#2200ff]">Blog</Link>
              <Link href="/ats-checker" className="font-semibold text-[#2200ff]">Free ATS Checker</Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-slate-700 transition hover:text-[#2200ff]"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2200ff] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:min-h-11 sm:px-6"
              >
                Start free
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Hero */}
      <section className="bg-white px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#2200ff]"
          >
            <ArrowLeft className="h-4 w-4" /> Blog & Resources
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            <span className="rounded-full bg-[#ece8ff] px-3 py-1.5 text-[#2200ff]">Free Tool</span>
            <span>Koalapply</span>
            <span>4 min read</span>
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Free ATS Resume Checker for Australian Job Seekers
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Paste your resume text and the job description below to see how well they match, and which keywords are missing before you hit apply.
          </p>
        </div>
      </section>

      {/* Tool */}
      <section className="px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <AtsChecker />
        </div>
      </section>

      {/* Supporting copy */}
      <section className="px-5 pb-6 pt-4 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-8 shadow-sm sm:px-8 lg:px-12 lg:py-12">
            <div className="space-y-10">

              <div id="what-ats-checks">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  What ATS Actually Checks For
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  Applicant Tracking Systems don't reject resumes based on vibes. Most systems used by Australian employers, including PageUp, JobAdder, Workday and SmartRecruiters, score applications primarily on:
                </p>
                <ul className="mt-5 space-y-3">
                  {whatAtsChecks.map((item) => (
                    <li key={item} className="flex gap-3 text-base leading-7 text-slate-600">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2200ff]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  A resume can be well-written and still score poorly if it uses different language to the job ad, or if it's formatted in a way the parser can't read cleanly.
                </p>
              </div>

              <div id="what-a-good-score-means">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  What a Good Score Means (and What It Doesn't)
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  A high keyword match score means your resume speaks the same language as the job description. It does not automatically mean you'll get an interview. ATS is a filter, not a hiring decision. The human reviewer who sees your resume after it clears the system still needs to be convinced you're a strong fit.
                </p>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  Treat your score as a first checkpoint, not the finish line. A low score is a clear signal something needs fixing before you apply. A high score means the resume will surface to a real person. After that, the quality of your achievements and how clearly you communicate them takes over.
                </p>
              </div>

              <div id="what-to-do-with-a-low-score">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  What to Do With a Low Score
                </h2>
                <ul className="mt-5 space-y-4">
                  {lowScoreSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-base leading-7 text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2200ff]" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-5">
                <p className="text-base leading-7 text-slate-700">
                  <span className="font-bold">Want your resume fully tailored, not just checked?</span>{" "}
                  Koalapply rewrites your resume against the specific job description, not just a keyword count.{" "}
                  <a href="/login" className="font-semibold text-[#2200ff] hover:underline">Try it free →</a>
                </p>
              </div>

              <div id="frequently-asked-questions">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Frequently Asked Questions
                </h2>
                <div className="mt-5 space-y-6">
                  {faqs.map((faq) => (
                    <div key={faq.q}>
                      <p className="font-bold text-slate-900">{faq.q}</p>
                      <p className="mt-1.5 text-base leading-7 text-slate-600">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <BlogResumeCTA />

      <section className="px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <NewsletterSignup />
        </div>
      </section>
    </main>
  );
}
