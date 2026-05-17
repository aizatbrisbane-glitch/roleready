"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LinkIcon, Sparkles, Upload } from "lucide-react";

type Props = {
  resumeFileName: string | null;
  coverLetterFileName: string | null;
};

function FileInputField({
  name,
  label,
  icon: Icon,
  savedFileName,
}: {
  name: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  savedFileName: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const display = chosen ?? savedFileName;
  const isSaved = Boolean(savedFileName && !chosen);

  return (
    <div>
      <p className="label mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>

      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
          isSaved
            ? "border-teal-200 bg-teal-50 hover:bg-teal-100"
            : "border-stone-200 bg-stone-50 hover:bg-stone-100"
        }`}
      >
        <p className={`truncate text-sm font-semibold ${display ? "text-stone-800" : "text-stone-400"}`}>
          {display ?? "Tap to select a file…"}
        </p>
        <p className={`mt-0.5 text-xs ${isSaved ? "text-teal-600" : "text-stone-400"}`}>
          {isSaved ? "✓ Saved and ready · tap to change" : chosen ? "Ready to upload" : "PDF, DOCX, TXT or MD"}
        </p>
      </button>

      <input
        ref={ref}
        type="file"
        name={name}
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => setChosen(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

export function QuickApplyForm({ resumeFileName, coverLetterFileName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [descText, setDescText] = useState("");

  useEffect(() => {
    if (!jobUrl) { setPreviewTitle(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/preview-url?url=${encodeURIComponent(jobUrl)}`);
        const data = await res.json();
        setPreviewTitle(data.title ?? null);
      } catch {
        setPreviewTitle(null);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [jobUrl]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/quick-start", { method: "POST", body: formData });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push(`/applications/${payload.applicationId}`);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
          <Sparkles className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-[17px] font-bold leading-tight text-stone-900">Quick Apply</h2>
          <p className="text-xs text-stone-500">Paste a job link and get tailored documents in under a minute.</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-stone-100 px-4 py-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <FileInputField name="resume_file"       label="Master Resume"       icon={Upload}   savedFileName={resumeFileName} />
          <FileInputField name="cover_letter_file" label="Master Cover Letter" icon={FileText} savedFileName={coverLetterFileName} />
        </div>

        <div>
          <label className="label mb-2 flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            Job Ad Link
          </label>
          <input
            name="job_url"
            type="url"
            className="field"
            placeholder="https://www.seek.com.au/job/12345678"
            required
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
          {previewTitle && (
            <p className="mt-1.5 text-sm text-stone-500">
              Preview: <span className="font-medium text-teal-700">{previewTitle}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label mb-2 block">Or paste the job ad text here</label>
          <textarea
            name="job_description_fallback"
            className="field min-h-20"
            placeholder="Optional — paste the job description if the link doesn't work."
            value={descText}
            onChange={(e) => setDescText(e.target.value)}
            maxLength={10000}
          />
          <p className="mt-1 text-xs text-stone-400">{descText.length.toLocaleString()}/10,000 characters</p>
        </div>
      </div>

      <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-3 sm:px-5">
        <button className="btn-primary w-full justify-center" disabled={loading} type="submit">
          <Sparkles className="h-4 w-4" />
          {loading ? "Creating…" : "Create Application"}
        </button>
        {message && <p className="mt-2 text-sm text-red-700">{message}</p>}
      </div>
    </form>
  );
}
