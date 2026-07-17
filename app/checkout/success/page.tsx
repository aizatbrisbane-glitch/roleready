import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PurchaseTracker } from "./PurchaseTracker";

export const metadata: Metadata = {
  title: "Payment Successful | Koalapply",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string; session_id?: string; plan?: string; value?: string }>;
}) {
  const { guest, session_id, plan, value } = await searchParams;
  const isGuest = guest === "true";
  const valueAudCents = value ? parseInt(value, 10) : 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      {plan && session_id && (
        <PurchaseTracker
          plan={plan}
          valueAudCents={valueAudCents}
          transactionId={session_id}
        />
      )}
      <div className="mx-auto max-w-md rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-[0_32px_80px_rgba(34,0,255,0.08)]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#2200ff]" />
        <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
          You&apos;re ready to apply.
        </h1>

        {isGuest ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your access pass has been activated.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>New here?</strong> Check the email you used at checkout — we&apos;ve sent you a link to set your password.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>Already have an account?</strong> Just log in below.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(34,0,255,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
            >
              Log in to Dashboard
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your access pass has been activated. Head to your dashboard to start applying.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(34,0,255,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
