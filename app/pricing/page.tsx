import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing | ApplyHQ",
  description: "Choose the ApplyHQ plan that matches your job search."
};

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "",
    features: [
      "3 application generations per month",
      "Basic resume tailoring",
      "Basic cover letter generation",
      "Application tracker"
    ],
    button: "Start Free",
    href: "/login"
  },
  {
    name: "Career Accelerator",
    price: "$19/month",
    description: "For professionals actively applying for jobs.",
    features: [
      "Unlimited application generations",
      "Resume tailoring",
      "Cover letters",
      "ATS optimisation",
      "Daily job recommendations",
      "Application tracking",
      "PDF and DOCX downloads"
    ],
    button: "Get Started",
    href: "/login"
  },
  {
    name: "Career Transition",
    price: "$49 for 3 months",
    badge: "Best Value",
    description: "For active job seekers, career changers and professionals impacted by redundancy.",
    features: [
      "Everything in Career Accelerator",
      "Interview preparation",
      "STAR answer builder",
      "Mock interview practice",
      "Company research brief",
      "Offer review",
      "Salary comparison",
      "Negotiation preparation"
    ],
    button: "Start Career Transition",
    href: "/login",
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "Contact Us",
    description: "For organisations supporting employees through career transitions and redundancy programs.",
    features: [
      "Bulk seat licensing",
      "Employee transition support",
      "Resume and cover letter tools",
      "Interview preparation",
      "Reporting and analytics"
    ],
    button: "Contact Sales",
    href: "mailto:sales@applyhq.com"
  }
];

const payAsYouGo = [
  { quantity: "10 Applications", price: "$5" },
  { quantity: "30 Applications", price: "$12" },
  { quantity: "100 Applications", price: "$30" }
];

const faqs = [
  {
    question: "Why not just use ChatGPT or Claude?",
    answer: "ChatGPT and Claude are excellent AI tools, and many people already use them to help write resumes and cover letters. The challenge is that finding a new job involves much more than generating text. You still need to search for suitable opportunities, tailor your resume for every application, track where you've applied, prepare for interviews, compare offers, manage multiple document versions, and keep everything organised throughout your job search. ApplyHQ brings that entire workflow together in one place. Instead of starting from a blank prompt every time, ApplyHQ maintains your career profile, understands your experience, tracks your applications, stores tailored documents, prepares interview responses, and helps guide you through every stage of your career transition. Think of ChatGPT and Claude as powerful AI engines. ApplyHQ is the career platform built around those capabilities, designed specifically to help you find, secure, and succeed in your next role."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Subscription plans are designed to be flexible, so you can stop when your job search changes."
  },
  {
    question: "How does the 3-month plan work?",
    answer: "Career Transition gives you three months of access for one payment, so you have focused support across the most active part of your search."
  },
  {
    question: "What happens after I get a job?",
    answer: "You can cancel, switch to pay as you go, or keep ApplyHQ ready for future opportunities."
  }
];

export default async function PricingPage() {
  const supabase = isSupabaseConfigured() ? await createSupabaseServerClient() : null;
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const showPublicHeader = !user;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {showPublicHeader ? (
        <header className="border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
            <Link href="/" className="inline-flex items-center">
              <img src="/brand/applyhq-logo-indigo.svg" alt="ApplyHQ" className="h-12 w-auto sm:h-14" />
            </Link>

            <nav className="hidden items-center gap-9 text-sm font-medium text-slate-700 md:flex">
              <Link href="/#how-it-works" className="transition hover:text-[#2200ff]">How it works</Link>
              <Link href="/#features" className="transition hover:text-[#2200ff]">Features</Link>
              <Link href="/pricing" className="text-[#2200ff] transition hover:text-[#1a00cc]">Pricing</Link>
              <Link href="/blog" className="transition hover:text-[#2200ff]">Blog</Link>
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
      ) : null}

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff]">
            Pricing
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Choose the right support for your job search.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Start free, scale up when applications get serious, or choose focused transition support for the next three months.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex rounded-[1.75rem] border bg-white p-6 shadow-sm ${
                plan.highlighted
                  ? "border-[#2200ff] shadow-[0_24px_70px_rgba(34,0,255,0.14)] lg:-mt-4 lg:mb-4"
                  : "border-slate-100"
              }`}
            >
              {plan.badge ? (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#c8ff00] px-3 py-1 text-xs font-bold text-slate-900">
                  <Star className="h-3.5 w-3.5 fill-slate-900 text-slate-900" />
                  {plan.badge}
                </span>
              ) : null}

              <div className="flex min-h-full w-full flex-col">
                <div className={plan.badge ? "pr-28" : ""}>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{plan.name}</h2>
                  <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{plan.price}</p>
                </div>

                {plan.description ? (
                  <p className="mt-4 min-h-18 text-sm leading-6 text-slate-600">{plan.description}</p>
                ) : (
                  <div className="mt-4 min-h-18" />
                )}

                <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#2200ff]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-[#2200ff] text-white shadow-[0_16px_35px_rgba(34,0,255,0.24)] hover:-translate-y-0.5 hover:bg-[#1a00cc]"
                      : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {plan.button}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
        <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Pay As You Go</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">For users who don&apos;t want a subscription.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {payAsYouGo.map((item) => (
                <div key={item.quantity} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-600">{item.quantity}</p>
                  <p className="mt-1 text-2xl font-black text-[#2200ff]">{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">FAQ</h2>
          </div>

          <div className="mt-8 divide-y divide-slate-100 rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
            {faqs.map((faq) => (
              <details key={faq.question} className="group p-5 open:bg-slate-50 first:rounded-t-[1.75rem] last:rounded-b-[1.75rem]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-slate-900">
                  {faq.question}
                  <span className="text-[#2200ff] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
