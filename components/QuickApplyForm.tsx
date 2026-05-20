"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, LinkIcon, Sparkles, Upload } from "lucide-react";

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
    <div className="hidden sm:block">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
          isSaved
            ? "bg-teal-50/90 text-[#0f8f83] shadow-[0_12px_34px_rgba(15,159,146,0.08)]"
            : "bg-white/70 text-slate-600 shadow-[0_12px_34px_rgba(20,33,61,0.05)]"
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0f9f92] shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
          <span className={`mt-1 block truncate text-sm font-medium ${display ? "text-[#14213d]" : "text-slate-400"}`}>
            {display ?? "Add when ready"}
          </span>
        </span>
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
    if (!jobUrl) {
      setPreviewTitle(null);
      return;
    }
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
    <form
      onSubmit={submit}
      className="relative max-w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-[#fffdf8] to-teal-50/80 p-4 shadow-[0_22px_70px_rgba(20,33,61,0.08)] md:p-8 lg:p-10"
    >
      <div className="pointer-events-none absolute right-6 top-5 h-28 w-28 rounded-full bg-teal-100/60 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-40 rounded-full bg-amber-100/60 blur-2xl" />

      <div className="relative grid min-w-0 gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f8f83] shadow-sm md:mb-5">
            <Sparkles className="h-4 w-4" />
            Start here
          </div>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight text-[#14213d] md:text-4xl">
            What job are you applying for today?
          </h2>
          <p className="mt-3 max-w-md text-base leading-7 text-slate-600 md:mt-4 md:leading-8">
            Paste a job link or description and we&apos;ll tailor your resume and cover letter in seconds.
          </p>
          <p className="mt-4 font-serif text-lg italic text-[#0f8f83] md:mt-6">It&apos;s that simple</p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="hidden gap-3 sm:grid sm:grid-cols-2">
            <FileInputField name="resume_file" label="Resume" icon={Upload} savedFileName={resumeFileName} />
            <FileInputField name="cover_letter_file" label="Cover letter" icon={FileText} savedFileName={coverLetterFileName} />
          </div>

          <div className="rounded-[1.5rem] bg-white/90 p-3 shadow-[0_18px_55px_rgba(20,33,61,0.07)]">
            <label className="flex items-center gap-3 sm:gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92] sm:h-11 sm:w-11">
                <LinkIcon className="h-5 w-5" />
              </span>
              <input
                name="job_url"
                type="url"
                className="min-h-12 min-w-0 flex-1 bg-transparent text-[16px] text-[#14213d] outline-none placeholder:text-slate-400 sm:min-h-0 sm:text-base"
                placeholder="Paste job link"
                required
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
              <button
                className="hidden shrink-0 items-center gap-2 rounded-full bg-[#0f9f92] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0b8f83] sm:inline-flex"
                disabled={loading}
                type="submit"
              >
                {loading ? "Generating..." : "Generate ✨"}
              </button>
            </label>
          </div>

          {previewTitle && (
            <p className="px-2 text-sm text-slate-600">
              Found: <span className="font-medium text-[#0f8f83]">{previewTitle}</span>
            </p>
          )}

          <details className="group rounded-[1.35rem] bg-white/55 px-4 py-4 shadow-[0_12px_34px_rgba(20,33,61,0.04)] sm:py-3">
            <summary className="cursor-pointer list-none text-base font-medium text-slate-600 transition group-open:text-[#0f8f83] sm:text-sm">
              Or paste job description
            </summary>
            <textarea
              name="job_description_fallback"
              className="mt-3 min-h-32 w-full resize-y rounded-2xl border-0 bg-white/85 px-4 py-3 text-[16px] leading-7 text-[#14213d] outline-none placeholder:text-slate-400 focus:ring-3 focus:ring-teal-100 sm:min-h-28 sm:text-sm sm:leading-6"
              placeholder="Paste the job description here if the link needs a little help."
              value={descText}
              onChange={(e) => setDescText(e.target.value)}
              maxLength={10000}
            />
            <p className="mt-2 text-xs text-slate-400">{descText.length.toLocaleString()}/10,000 characters</p>
          </details>

          <button
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-7 py-4 text-base font-semibold text-white shadow-[0_20px_54px_rgba(15,159,146,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#0b8f83] sm:hidden"
            disabled={loading}
            type="submit"
          >
            {loading ? "Generating..." : "Generate ✨"} <ArrowRight className="h-5 w-5" />
          </button>

          {message && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>}
        </div>
      </div>
    </form>
  );
}
