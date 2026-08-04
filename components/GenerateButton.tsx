"use client";

import { Gift, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NewsletterBonusToast } from "@/components/NewsletterBonusToast";

type Props = {
  applicationId: string;
  hasDocuments: boolean;
  canGenerate: boolean;
  newsletterSubscribed?: boolean;
  autoGenerate?: boolean;
  generateHint?: string | null;
};

const STAGE_LABELS: { threshold: number; label: string }[] = [
  { threshold: 0,  label: "Starting up..." },
  { threshold: 8,  label: "Analysing job description..." },
  { threshold: 22, label: "Comparing with your experience..." },
  { threshold: 42, label: "Crafting your tailored resume..." },
  { threshold: 66, label: "Writing personalised cover letter..." },
  { threshold: 84, label: "Finalising match analysis..." },
  { threshold: 95, label: "Almost there..." },
];

function getStageLabel(pct: number) {
  let label = STAGE_LABELS[0].label;
  for (const stage of STAGE_LABELS) {
    if (pct >= stage.threshold) label = stage.label;
  }
  return label;
}

// Asymptotic curve: fast early, crawls near 95
function nextProgress(current: number) {
  if (current < 40) return current + 1.1;
  if (current < 65) return current + 0.45;
  if (current < 82) return current + 0.30;
  return current + 0.25;
}

export function GenerateButton({ applicationId, hasDocuments, canGenerate, newsletterSubscribed, autoGenerate, generateHint }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [showNewsletterOffer, setShowNewsletterOffer] = useState(false);
  const [showSubscribeSuccess, setShowSubscribeSuccess] = useState(false);
  const [subscribingInline, setSubscribingInline] = useState(false);
  const [inlineSubscribeDone, setInlineSubscribeDone] = useState(false);
  const generatingRef = useRef(false);
  const autoGenerateStartedRef = useRef(false);

  useEffect(() => {
    if (!autoGenerate || autoGenerateStartedRef.current) return;
    autoGenerateStartedRef.current = true;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) return;
    setProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(nextProgress(current), 95);
      setProgress(Math.round(current));
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  async function generate() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setLoading(true);
    window.dispatchEvent(new CustomEvent("koalapply:generating", { detail: { loading: true } }));
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`/api/applications/${applicationId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "anthropic" }),
        signal: controller.signal,
      });
      const payload = await response.text().then((t) => (t ? JSON.parse(t) : null));
      if (!response.ok) {
        setMessage(payload?.error ?? "Unable to prepare application.");
        setLoading(false);
        return;
      }
      setProgress(100);
      if (payload?.showNewsletterOffer) {
        setShowNewsletterOffer(true);
      }
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Generation timed out. Try ChatGPT or shorten the job ad text."
          : "Generation failed. Try again."
      );
    } finally {
      window.clearTimeout(timeout);
      generatingRef.current = false;
      setLoading(false);
      window.dispatchEvent(new CustomEvent("koalapply:generating", { detail: { loading: false } }));
    }
  }

  async function subscribeFromToast() {
    setShowNewsletterOffer(false);
    await fetch("/api/newsletter/bonus", { method: "POST" });
    setShowSubscribeSuccess(true);
    setTimeout(() => setShowSubscribeSuccess(false), 5000);
    router.refresh();
  }

  function dismissToast() {
    setShowNewsletterOffer(false);
  }

  async function subscribeInline() {
    setSubscribingInline(true);
    await fetch("/api/newsletter/bonus", { method: "POST" });
    setSubscribingInline(false);
    setInlineSubscribeDone(true);
    router.refresh();
  }

  return (
    <>
      {!canGenerate ? (
        <div className="flex w-full flex-col gap-2 lg:w-auto">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(34,0,255,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:px-5"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            Upgrade to generate
          </Link>
          {!newsletterSubscribed && !inlineSubscribeDone && (
            <button
              type="button"
              onClick={subscribeInline}
              disabled={subscribingInline}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2200ff] px-4 py-2.5 text-sm font-semibold text-[#2200ff] transition hover:-translate-y-0.5 hover:bg-[#ece8ff] disabled:opacity-70 sm:px-5"
            >
              <Gift className="h-4 w-4 shrink-0" />
              {subscribingInline ? "Unlocking…" : "Get 1 free generation"}
            </button>
          )}
          <p className="text-xs text-slate-500">
            {inlineSubscribeDone
              ? "Unlocked! Refresh the page to use your free generation."
              : !newsletterSubscribed
              ? "Or subscribe to career tips for a free extra generation."
              : "You've used your free application this month."}
          </p>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 lg:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={generate}
              disabled={loading}
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2200ff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(34,0,255,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-70 sm:px-5"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              {loading ? "Generating…" : hasDocuments ? "Regenerate" : "Generate documents"}
            </button>
          </div>

          {loading && (
            <div className="w-full min-w-[260px] lg:min-w-[300px]">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{getStageLabel(progress)}</span>
                <span className="text-xs font-semibold tabular-nums text-[#2200ff]">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#2200ff] transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                This can take up to two minutes while the AI writes both documents.
              </p>
            </div>
          )}

          {message && <p className="text-xs text-red-600">{message}</p>}
          {generateHint && !loading && <p className="text-xs text-amber-600">{generateHint}</p>}
        </div>
      )}

      {showNewsletterOffer && (
        <NewsletterBonusToast onSubscribe={subscribeFromToast} onDismiss={dismissToast} />
      )}

      {showSubscribeSuccess && (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-slate-100">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">You're subscribed!</p>
              <p className="mt-0.5 text-sm text-slate-500">Your 2nd free generation has been unlocked. Use it on your next application.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
