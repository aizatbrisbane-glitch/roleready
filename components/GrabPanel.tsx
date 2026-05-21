"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import type { GrabResult } from "@/app/api/grab/route";

type Props = {
  hasResume: boolean;
};

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "";
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-teal-100 text-teal-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-600";
}

export function GrabPanel({ hasResume }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [jobs, setJobs] = useState<GrabResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [keywords, setKeywords] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [imported, setImported] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState<Record<string, boolean>>({});

  async function grab() {
    setStatus("loading");
    setErrorMsg("");
    setJobs([]);
    setImported({});

    const url = keywords.trim() ? `/api/grab?q=${encodeURIComponent(keywords.trim())}` : "/api/grab";
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorMsg(data.error ?? "Something went wrong.");
      return;
    }

    setJobs(data.jobs ?? []);
    setSearchQuery(data.searchQuery ?? "");
    // Pre-fill keywords with AI-extracted query so user can refine next time
    if (!keywords.trim() && data.searchQuery) {
      setKeywords(data.searchQuery);
    }
    setStatus("done");
  }

  async function importJob(job: GrabResult) {
    setImporting((prev) => ({ ...prev, [job.id]: true }));

    const res = await fetch("/api/grab/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: job.title,
        company: job.company,
        location: job.location,
        salary: formatSalary(job.salaryMin, job.salaryMax),
        jobUrl: job.jobUrl,
        description: job.description,
        matchScore: job.matchScore,
        matchReason: job.matchReason,
      }),
    });
    const data = await res.json();

    setImporting((prev) => ({ ...prev, [job.id]: false }));

    if (res.ok && data.applicationId) {
      setImported((prev) => ({ ...prev, [job.id]: data.applicationId }));
      router.refresh();
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Zap className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
          <div>
            <h2 className="text-xl font-bold text-stone-950">Grab Today's Jobs</h2>
            <p className="mt-0.5 text-sm text-stone-600">
              Search Australian job boards and rank matches against your master resume — then import the ones you want.
            </p>
          </div>
        </div>

        <button
          className="btn-primary shrink-0"
          disabled={status === "loading" || !hasResume}
          onClick={grab}
          type="button"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Grabbing…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Grab
            </>
          )}
        </button>
      </div>

      <div className="mt-4">
        <label className="label mb-1 block">Keywords</label>
        <input
          type="text"
          className="field"
          placeholder="e.g. risk governance compliance manager — leave blank to auto-extract from resume"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && status !== "loading" && hasResume && grab()}
        />
      </div>

      {!hasResume && status === "idle" && (
        <p className="mt-3 text-sm text-amber-700">Upload a master resume above to enable job grabbing.</p>
      )}

      {status === "loading" && (
        <p className="mt-4 animate-pulse text-sm text-stone-500">
          Searching Australian job boards and scoring matches with AI…
        </p>
      )}

      {status === "error" && <p className="mt-4 text-sm text-red-700">{errorMsg}</p>}

      {status === "done" && (
        <div className="mt-4">
          {searchQuery && (
            <p className="mb-3 text-xs text-stone-400">
              Searched job boards for: <span className="font-medium text-stone-600">"{searchQuery}"</span>
            </p>
          )}

          {jobs.length === 0 ? (
            <p className="text-sm text-stone-500">
              No matching jobs found in the last 3 days. Try again tomorrow, or update your master resume with more keywords.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {jobs.map((job) => {
                const salary = formatSalary(job.salaryMin, job.salaryMax);
                const isImporting = importing[job.id];
                const applicationId = imported[job.id];

                return (
                  <li key={job.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${scoreBadgeClass(job.matchScore)}`}
                      >
                        {job.matchScore}%
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-stone-950 hover:underline"
                          >
                            {job.title}
                          </a>
                          <ExternalLink className="h-3 w-3 shrink-0 text-stone-400" />
                        </div>

                        <p className="text-sm text-stone-600">
                          {job.company} · {job.location}
                          {salary ? ` · ${salary}` : ""}
                          {job.salary && !salary ? ` · ${job.salary}` : ""}
                        </p>
                        {job.source && (
                          <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                            {job.source}
                          </span>
                        )}

                        {job.matchReason && <p className="mt-1 text-sm text-stone-500">{job.matchReason}</p>}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {applicationId ? (
                        <a href={`/applications/${applicationId}`} className="text-sm font-semibold text-teal-700 hover:underline">
                          Imported ✓
                        </a>
                      ) : (
                        <button
                          className="btn-secondary"
                          disabled={isImporting}
                          onClick={() => importJob(job)}
                          type="button"
                        >
                          {isImporting ? "Importing…" : "Import"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
