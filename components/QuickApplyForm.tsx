"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, LinkIcon, Sparkles } from "lucide-react";
import { inferCountry, boardsHint } from "@/lib/country-inference";

const FETCH_STAGES = [
  { after: 0,  label: "Reading job ad..." },
  { after: 6,  label: "Extracting job details..." },
  { after: 16, label: "Setting up your application..." },
  { after: 28, label: "Almost ready, hang tight..." },
];

function useFetchStage(loading: boolean) {
  const [stage, setStage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!loading) {
      setStage(0);
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
      return;
    }
    setStage(0);
    FETCH_STAGES.forEach((s, i) => {
      if (i === 0) return;
      const t = setTimeout(() => setStage(i), s.after * 1000);
      timerRef.current.push(t);
    });
    return () => {
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
    };
  }, [loading]);

  return FETCH_STAGES[stage].label;
}

const BLOCKED_HOSTS = ["jora.com", "indeed.com", "au.indeed.com", "www.indeed.com", "www.jora.com"];

// Job boards that show job details in a side panel without changing the URL to a direct job link.
// We detect these and prompt the user to open the job in a new tab instead.
const SEARCH_PAGE_PATTERNS: { test: (u: URL) => boolean; message: string }[] = [
  {
    // Reed: direct job URLs end with a numeric ID, e.g. /jobs/job-title/72374836
    // A URL without a numeric last segment is a search results page.
    test: (u) => {
      if (!u.hostname.replace(/^www\./, "").endsWith("reed.co.uk")) return false;
      const last = u.pathname.split("/").filter(Boolean).pop() ?? "";
      return !/^\d{5,}$/.test(last);
    },
    message: 'This looks like a Reed search page. Click a job, then right-click the title and "Open in new tab" to get the direct job URL.',
  },
  {
    // Totaljobs: direct job URLs end with a numeric ID, e.g. /jobs/job-title/12345678
    test: (u) => {
      if (!u.hostname.replace(/^www\./, "").endsWith("totaljobs.com")) return false;
      const last = u.pathname.split("/").filter(Boolean).pop() ?? "";
      return !/^\d{5,}$/.test(last);
    },
    message: 'This looks like a Totaljobs search page. Click a job, then right-click the title and "Open in new tab" to get the direct job URL.',
  },
  {
    // CV-Library: direct job URLs end with a numeric ID, e.g. /job/123456/job-title
    test: (u) => {
      if (!u.hostname.replace(/^www\./, "").endsWith("cv-library.co.uk")) return false;
      const segments = u.pathname.split("/").filter(Boolean);
      // /job/{id}/{slug} — second segment should be numeric
      return !(segments[0] === "job" && /^\d{5,}$/.test(segments[1] ?? ""));
    },
    message: 'This looks like a CV-Library search page. Click a job, then right-click the title and "Open in new tab" to get the direct job URL.',
  },
];

type Props = {
  resumeFileName: string | null;
  coverLetterFileName: string | null;
  profileLocation?: string | null;
};

export function QuickApplyForm({ resumeFileName: _resumeFileName, coverLetterFileName: _coverLetterFileName, profileLocation }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fetchStageLabel = useFetchStage(loading);
  const [message, setMessage] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [descText, setDescText] = useState("");
  const [urlWarning, setUrlWarning] = useState("");
  const [descOpen, setDescOpen] = useState(false);

  function isBlockedHost(url: string) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return BLOCKED_HOSTS.some((b) => b.replace(/^www\./, "") === host);
    } catch {
      return false;
    }
  }

  function searchPageWarning(url: string): string | null {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      return SEARCH_PAGE_PATTERNS.find((p) => p.test(u))?.message ?? null;
    } catch {
      return null;
    }
  }

  function handleUrlChange(value: string) {
    setJobUrl(value);
    if (value && isBlockedHost(value)) {
      setUrlWarning("Indeed and Jora block link imports. Paste the job description below instead.");
      setDescOpen(true);
    } else {
      const spw = value ? searchPageWarning(value) : null;
      setUrlWarning(spw ?? "");
    }
  }

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
    if (!jobUrl.trim() && !descText.trim()) {
      setMessage("Paste a job link or the job description first.");
      return;
    }
    // Block search results page URLs — user must open the specific job first
    const spw = jobUrl.trim() ? searchPageWarning(jobUrl.trim()) : null;
    if (spw && !descText.trim()) {
      setMessage(spw);
      return;
    }
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/quick-start", { method: "POST", body: formData });
    const payload = await response.json();

    if (!response.ok) {
      if (payload.errorCode === "JOB_TEXT_UNAVAILABLE") {
        setDescOpen(true);
        setMessage("We couldn't read that page — paste the job description below and submit again.");
      } else {
        setMessage(payload.error ?? "Something went wrong.");
      }
      setLoading(false);
      return;
    }

    router.push(`/applications/${payload.applicationId}?generate=true`);
  }

  return (
    <form
      onSubmit={submit}
      className="relative max-w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-[#ece8ff]/40 p-5 shadow-[0_22px_70px_rgba(34,0,255,0.08)] md:p-7"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[#d4ccff]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-36 w-52 rounded-full bg-violet-100/40 blur-3xl" />

      <div className="relative grid min-w-0 items-center gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-8">
        {/* Left: headline */}
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#2200ff] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Start here
          </div>
          <h2 className="text-2xl font-bold leading-tight text-slate-900 md:text-[2.1rem]">
            What job are you applying for today?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Paste a job link and we&apos;ll tailor your resume and cover letter in seconds.
          </p>
          {(() => {
            if (!profileLocation?.trim()) return (
              <p className="mt-2 hidden text-xs text-slate-400 sm:block">
                Works best with <span className="font-semibold text-slate-500">SEEK</span>, <span className="font-semibold text-slate-500">LinkedIn</span>, <span className="font-semibold text-slate-500">Reed</span> and <span className="font-semibold text-slate-500">JobStreet</span>. For search pages, open the job in a new tab first.
              </p>
            );
            const hint = boardsHint(inferCountry([profileLocation]));
            const boardNames = hint.boards.split(/,? and |, /).map((b) => b.trim());
            return (
              <p className="mt-2 hidden text-xs text-slate-400 sm:block">
                Works best with{" "}
                {boardNames.map((b, i) => (
                  <span key={b}>
                    <span className="font-semibold text-slate-500">{b}</span>
                    {i < boardNames.length - 1 ? ", " : ""}
                  </span>
                ))}. {hint.note}
              </p>
            );
          })()}
        </div>

        {/* Right: inputs */}
        <div className="min-w-0 space-y-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ece8ff] text-[#2200ff]">
                <LinkIcon className="h-4 w-4" />
              </span>
              <input
                name="job_url"
                type="url"
                className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm"
                placeholder="Paste job link"
                value={jobUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              <button
                className="hidden shrink-0 rounded-xl bg-[#2200ff] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-70 sm:block"
                disabled={loading}
                type="submit"
              >
                {loading ? "Working…" : "Generate ✨"}
              </button>
            </div>
          </div>

          {urlWarning && (
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>{urlWarning}</span>
            </div>
          )}

          {!urlWarning && previewTitle && (
            <p className="px-2 text-sm text-slate-600">
              Found: <span className="font-medium text-[#2200ff]">{previewTitle}</span>
            </p>
          )}

          <button
            className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-7 py-3.5 text-base font-semibold text-white shadow-[0_16px_40px_rgba(34,0,255,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#1a00cc] sm:hidden"
            disabled={loading}
            type="submit"
          >
            {loading ? "Working…" : "Generate ✨"} <ArrowRight className="h-5 w-5" />
          </button>

          <details open={descOpen} onToggle={(e) => setDescOpen((e.currentTarget as HTMLDetailsElement).open)} className="group rounded-2xl border border-slate-100 bg-white px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-500 transition group-open:text-[#2200ff]">
              Or paste job description
            </summary>
            <textarea
              name="job_description_fallback"
              className="mt-3 min-h-28 w-full resize-y rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#d4ccff]"
              placeholder="Paste the full job description here — works even without a link."
              value={descText}
              onChange={(e) => setDescText(e.target.value)}
              maxLength={10000}
            />
            <p className="mt-1.5 text-xs text-slate-400">{descText.length.toLocaleString()} / 10,000</p>
          </details>

          {loading && (
            <div className="rounded-2xl bg-[#ece8ff]/60 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[#2200ff] animate-pulse">{fetchStageLabel}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#d4ccff]">
                <div className="h-full w-1/3 rounded-full bg-[#2200ff] animate-[indeterminate_1.8s_ease-in-out_infinite]" />
              </div>
              <p className="mt-2 text-xs text-slate-500">This usually takes 15–30 seconds.</p>
            </div>
          )}

          {!loading && message && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>}
        </div>
      </div>
    </form>
  );
}
