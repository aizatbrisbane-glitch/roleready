"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AiProvider = "openai" | "anthropic";

type Props = {
  applicationId: string;
  hasDocuments: boolean;
};

export function GenerateButton({ applicationId, hasDocuments }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [message, setMessage] = useState("");

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
        return;
      }
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Generation timed out. Try OpenAI or shorten the job ad text."
          : "Generation failed. Try again."
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
          <span className="text-xs text-slate-500">AI</span>
          <select
            className="bg-transparent text-sm outline-none"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            disabled={loading}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>
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
      {loading && <p className="text-xs text-slate-500">This can take 30–90 seconds…</p>}
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
