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
    <div className="w-full space-y-2 sm:w-auto">
      {/* Download grid — 2×2 on mobile, inline on sm+ */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        <DownloadLink href={`/api/applications/${applicationId}/export?type=resume&format=docx`} label="Resume DOCX" disabled={!hasDocuments} />
        <DownloadLink href={`/api/applications/${applicationId}/export?type=resume&format=pdf`}  label="Resume PDF"  disabled={!hasDocuments} />
        <DownloadLink href={`/api/applications/${applicationId}/export?type=cover&format=docx`}  label="Cover DOCX"  disabled={!hasDocuments} />
        <DownloadLink href={`/api/applications/${applicationId}/export?type=cover&format=pdf`}   label="Cover PDF"   disabled={!hasDocuments} />
      </div>
    </div>
  );
}
