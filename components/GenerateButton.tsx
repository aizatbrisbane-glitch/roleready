"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AiProvider = "openai" | "anthropic";

type Props = {
  applicationId: string;
  hasDocuments: boolean;
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
  if (current < 65) return current + 0.55;
  if (current < 82) return current + 0.22;
  return current + 0.06;
}

export function GenerateButton({ applicationId, hasDocuments, autoGenerate, generateHint }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoGenerate) generate();
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
    setLoading(true);
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`/api/applications/${applicationId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
        signal: controller.signal,
      });
      const payload = await response.text().then((t) => (t ? JSON.parse(t) : null));
      if (!response.ok) {
        setMessage(payload?.error ?? "Unable to prepare application.");
        setLoading(false);
        return;
      }
      setProgress(100);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Generation timed out. Try ChatGPT or shorten the job ad text."
          : "Generation failed. Try again."
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3 lg:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {hasDocuments && (
          <label className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
            <span className="text-xs text-slate-500">AI</span>
            <select
              className="bg-transparent text-sm outline-none"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              disabled={loading}
            >
              <option value="anthropic">Claude</option>
              <option value="openai">ChatGPT</option>
            </select>
          </label>
        )}
        <button
          onClick={generate}
          disabled={loading}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0b8f83] disabled:opacity-70 sm:px-5"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {loading ? "Generating…" : hasDocuments ? "Regenerate" : "Generate documents"}
        </button>
      </div>

      {loading && (
        <div className="w-full min-w-[260px] lg:min-w-[300px]">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{getStageLabel(progress)}</span>
            <span className="text-xs font-semibold tabular-nums text-[#0f8f83]">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-[#0f9f92] transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {message && <p className="text-xs text-red-600">{message}</p>}
      {generateHint && !loading && <p className="text-xs text-amber-600">{generateHint}</p>}
    </div>
  );
}
