import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { EnterpriseRequestForm } from "@/components/EnterpriseRequestForm";

export const metadata: Metadata = {
  title: "Enterprise Request | ApplyHQ",
  description: "Request ApplyHQ Enterprise access for your organisation.",
};

const benefits = [
  "90-day employee access for career transition programs",
  "Admin-managed seats without exposing private job search content",
  "Application credits for resume and cover letter tailoring",
  "Manual setup with volume pricing available",
];

export default function EnterpriseRequestPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="inline-flex items-center">
            <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-24 w-auto sm:h-28" />
          </Link>
          <Link href="/pricing" className="text-sm font-semibold text-slate-600 transition hover:text-[#2200ff]">
            Back to pricing
          </Link>
        </div>
      </header>

      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ece8ff] text-[#2200ff]">
              <Building2 className="h-6 w-6" />
            </span>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">ApplyHQ Enterprise</p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Support employees through their next career move.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Tell us what your organisation needs. We&apos;ll review the request, confirm packaging, and manually set up your enterprise workspace.
            </p>

            <div className="mt-8 space-y-3">
              {benefits.map((benefit) => (
                <p key={benefit} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2200ff]" />
                  <span>{benefit}</span>
                </p>
              ))}
            </div>

            <p className="mt-8 flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2200ff]" />
              Employee resumes, cover letters, applications, and notes remain private. Enterprise admins only see seat status and usage.
            </p>
          </div>

          <EnterpriseRequestForm />
        </div>
      </section>
    </main>
  );
}
