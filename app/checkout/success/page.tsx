import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Successful | ApplyHQ",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="mx-auto max-w-md rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-[0_32px_80px_rgba(34,0,255,0.08)]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#2200ff]" />
        <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
          You&apos;re ready to apply.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your access pass has been activated. Head to your dashboard to start applying.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(34,0,255,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
