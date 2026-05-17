"use client";

import { Download, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AiProvider = "openai" | "anthropic";

type Props = {
  applicationId: string;
  hasDocuments: boolean;
};

function DownloadLink({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  return (
    <a
      href={disabled ? undefined : href}
      className={`btn-secondary justify-center ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <Download className="h-3.5 w-3.5 shrink-0" />
      {label}
    </a>
  );
}

export function ApplicationActions({ applicationId, hasDocuments }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState<AiProvider>("anthropic");

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
    <div className="w-full space-y-3 sm:w-auto sm:space-y-2">
      {/* Generate row */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800">
          <span>AI</span>
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
        <button className="btn-primary flex-1 justify-center sm:flex-none" disabled={loading} onClick={generate} type="button">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">{loading ? "Generating…" : hasDocuments ? "Regenerate" : "Generate Docs"}</span>
          <span className="hidden sm:inline">{loading ? "Generating…" : hasDocuments ? "Regenerate Documents" : "Generate Tailored Documents"}</span>
        </button>
      </div>

      {/* Download grid — 2×2 on mobile, inline on sm+ */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        <DownloadLink href={`/api/applications/${applicationId}/export?type=resume&format=docx`} label="Resume DOCX" disabled={!hasDocuments} />
        <DownloadLink href={`/api/applications/${applicationId}/export?type=resume&format=pdf`}  label="Resume PDF"  disabled={!hasDocuments} />
        <DownloadLink href={`/api/applications/${applicationId}/export?type=cover&format=docx`}  label="Cover DOCX"  disabled={!hasDocuments} />
        <DownloadLink href={`/api/applications/${applicationId}/export?type=cover&format=pdf`}   label="Cover PDF"   disabled={!hasDocuments} />
      </div>

      {message && <p className="text-sm text-red-700">{message}</p>}
      {loading && <p className="text-sm text-stone-500">This can take 30–90 seconds. Keep this page open.</p>}
    </div>
  );
}
