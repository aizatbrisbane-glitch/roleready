"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { QuickApplyForm } from "@/components/QuickApplyForm";
import type { GrabResult } from "@/app/api/grab/route";
import type { ApplicationWithJob, CachedGrabbedJob } from "@/types/database";

type Props = {
  applications: ApplicationWithJob[];
  resumeFileName: string | null;
  coverLetterFileName: string | null;
  userName?: string | null;
  profileLocation?: string | null;
  grabbedMatches: CachedGrabbedJob[];
  grabbedMatchesStale: boolean;
};

const WORK_TYPE_OPTIONS = [
  { value: "full_time",  label: "Full-time" },
  { value: "part_time",  label: "Part-time" },
  { value: "hybrid",     label: "Hybrid" },
  { value: "onsite",     label: "Onsite" },
  { value: "permanent",  label: "Permanent" },
  { value: "contract",   label: "Contract" },
];

function firstName(name?: string | null) {
  const clean = name?.split("@")[0]?.trim();
  if (!clean) return null;
  return clean.split(/\s+/)[0];
}

function matchLabel(score: number | null) {
  if (score === null) return "Worth reviewing";
  if (score >= 85) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Worth reviewing";
  return "Needs tailoring";
}

function cachedMatchToGrabResult(row: CachedGrabbedJob): GrabResult {
  return {
    id: row.external_id,
    title: row.title,
    company: row.company,
    location: row.location,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    description: row.description,
    jobUrl: row.job_url,
    matchScore: row.match_score,
    matchReason: row.match_reason,
    postedAt: row.posted_at ?? row.created_at,
    fetchedAt: row.fetched_at,
  };
}

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return "";
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function matchPillClass(score: number) {
  if (score >= 85) return "bg-teal-100 text-[#0f8f83]";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  if (score >= 50) return "bg-violet-100 text-violet-700";
  return "bg-rose-50 text-rose-600";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function GrabbedMatchCard({
  job,
  importedApplicationId,
  importing,
  onImport,
}: {
  job: GrabResult;
  importedApplicationId?: string;
  importing: boolean;
  onImport: (job: GrabResult) => void;
}) {
  const salary = job.salary || formatSalary(job.salaryMin, job.salaryMax);
  const label = matchLabel(job.matchScore);

  return (
    <article className="group flex items-center gap-3 rounded-[1.6rem] bg-white/82 p-4 shadow-[0_8px_30px_rgba(20,33,61,0.055)] transition duration-200 hover:bg-white hover:shadow-[0_16px_48px_rgba(20,33,61,0.08)] md:gap-4 md:p-5">
      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-amber-50 text-base font-bold text-[#0f8f83] md:h-12 md:w-12">
        {(job.company?.trim()?.[0] ?? "A").toUpperCase()}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-semibold text-[#14213d] transition hover:text-[#0f8f83]"
          >
            {job.title}
          </a>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-slate-500">
          <span>{job.company}</span>
          {job.location && (
            <>
              <span className="text-slate-300">•</span>
              <MapPin className="h-3 w-3 text-slate-400" />
              <span>{job.location}</span>
            </>
          )}
        </p>
        {salary && (
          <p className="mt-0.5 text-sm font-medium text-slate-700">{salary}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {/* Score */}
        <div className="hidden text-right sm:block">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold tabular-nums ${matchPillClass(job.matchScore)}`}>
            {job.matchScore}% Match
          </span>
          <p className="mt-0.5 text-xs text-slate-500">{label}</p>
        </div>

        {/* Action button */}
        {importedApplicationId ? (
          <Link
            href={`/applications/${importedApplicationId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0f9f92] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0b8f83]"
          >
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled={importing}
            onClick={() => onImport(job)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0f9f92] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0b8f83] disabled:opacity-70"
          >
            {importing ? "Starting…" : "Tailor & Apply"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Bookmark */}
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="View original job"
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-[#0f8f83] sm:inline-flex"
        >
          <Bookmark className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export function DashboardTabs({
  applications,
  resumeFileName,
  coverLetterFileName,
  userName,
  profileLocation,
  grabbedMatches,
  grabbedMatchesStale,
}: Props) {
  const router = useRouter();
  const name = firstName(userName);
  const [matches, setMatches] = useState<GrabResult[]>(() => grabbedMatches.map(cachedMatchToGrabResult));
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchNotice, setMatchNotice] = useState("");
  const [keywordQuery, setKeywordQuery] = useState(grabbedMatches[0]?.search_query ?? "");
  const [locationQuery, setLocationQuery] = useState(profileLocation ?? "");
  const [workTypes, setWorkTypes] = useState<Set<string>>(new Set());
  const [salaryMin, setSalaryMin] = useState("");
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [imported, setImported] = useState<Record<string, string>>({});
  const [showAllMatches, setShowAllMatches] = useState(false);

  const importedByUrl = useMemo(() => {
    const map: Record<string, string> = {};
    for (const app of applications) {
      if (app.jobs?.job_url) map[app.jobs.job_url] = app.id;
    }
    return map;
  }, [applications]);

  function toggleWorkType(value: string) {
    setWorkTypes((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  async function refreshMatches(force = false) {
    if (!resumeFileName) return;
    setLoadingMatches(true);
    setMatchError("");
    setMatchNotice(force ? "Searching…" : "Checking today's matches…");

    try {
      const params = new URLSearchParams();
      if (force) params.set("refresh", "true");

      // Keyword-based work types (hybrid, onsite) get appended to the query
      const kwWorkTypes = [...workTypes]
        .filter((wt) => ["hybrid", "onsite"].includes(wt))
        .join(" ");
      const effectiveKeyword = [keywordQuery.trim(), kwWorkTypes].filter(Boolean).join(" ");
      if (effectiveKeyword) params.set("q", effectiveKeyword);

      if (locationQuery.trim()) params.set("location", locationQuery.trim());

      // Adzuna-native work types
      const adzunaWorkTypes = [...workTypes]
        .filter((wt) => ["full_time", "part_time", "contract", "permanent"].includes(wt))
        .join(",");
      if (adzunaWorkTypes) params.set("work_type", adzunaWorkTypes);

      if (salaryMin) params.set("salary_min", salaryMin);

      const qs = params.toString();
      const response = await fetch(`/api/grab${qs ? `?${qs}` : ""}`);
      const payload = await response.json();

      if (!response.ok) {
        setMatchError(payload.error ?? "Couldn't refresh matches just now.");
        return;
      }

      const nextMatches = payload.jobs ?? [];
      setMatches(nextMatches);
      setKeywordQuery(payload.searchQuery ?? keywordQuery);
      setShowAllMatches(false);
      setMatchNotice(
        nextMatches.length > 0
          ? `Found ${nextMatches.length} fresh ${nextMatches.length === 1 ? "match" : "matches"} for "${payload.searchQuery}".`
          : `No fresh matches found${payload.searchQuery ? ` for "${payload.searchQuery}"` : ""}. Try different keywords.`
      );
    } catch {
      setMatchError("Couldn't refresh matches just now.");
    } finally {
      setLoadingMatches(false);
    }
  }

  async function importJob(job: GrabResult) {
    setImporting((prev) => ({ ...prev, [job.id]: true }));
    try {
      const response = await fetch("/api/grab/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary || formatSalary(job.salaryMin, job.salaryMax),
          jobUrl: job.jobUrl,
          description: job.description,
          matchScore: job.matchScore,
          matchReason: job.matchReason,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.applicationId) {
        setMatchError(payload.error ?? "Couldn't start that application.");
        return;
      }
      setImported((prev) => ({ ...prev, [job.id]: payload.applicationId }));
      router.push(`/applications/${payload.applicationId}`);
      router.refresh();
    } catch {
      setMatchError("Couldn't start that application.");
    } finally {
      setImporting((prev) => ({ ...prev, [job.id]: false }));
    }
  }

  useEffect(() => {
    if (resumeFileName && grabbedMatchesStale) {
      void refreshMatches(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFileName, grabbedMatchesStale]);

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loadingMatches && resumeFileName) void refreshMatches(true);
  };

  return (
    <div className="mx-auto max-w-[1520px] overflow-x-clip">
      {/* Greeting */}
      <div className="mb-6 md:mb-10">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
          {getGreeting()}{name ? `, ${name}` : ""} 👋
        </h1>
      </div>

      <div className="min-w-0 space-y-6 md:space-y-8">
        <QuickApplyForm resumeFileName={resumeFileName} coverLetterFileName={coverLetterFileName} />

        {/* Fresh opportunities */}
        <section>
          {/* Section header */}
          <div className="mb-4 px-1">
            <h2 className="text-2xl font-semibold tracking-tight text-[#14213d]">
              Find jobs that match your resume ✨
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Top matches discovered from live job boards and scored against your resume.
            </p>

            {/* Filter bar */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
              {/* Keywords */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Search keywords</p>
                <input
                  className="w-full rounded-2xl bg-white/90 px-4 py-2.5 text-sm text-[#14213d] shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-100"
                  placeholder="e.g. Communications Manager"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  onKeyDown={onEnter}
                />
              </div>

              {/* Location */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Job location</p>
                <input
                  className="w-full rounded-2xl bg-white/90 px-4 py-2.5 text-sm text-[#14213d] shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-100"
                  placeholder="e.g. Sydney"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={onEnter}
                />
              </div>

              {/* Salary */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Min. salary expectation per annum</p>
                <div className="flex items-center gap-0 overflow-hidden rounded-2xl bg-white/90 shadow-sm focus-within:ring-2 focus-within:ring-teal-100">
                  <span className="pl-4 text-sm font-medium text-slate-400">$</span>
                  <input
                    type="number"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#14213d] outline-none placeholder:text-slate-400"
                    placeholder="e.g. 100000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    onKeyDown={onEnter}
                    min={0}
                  />
                </div>
              </div>

              {/* More preferences + refresh */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">More preferences</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {WORK_TYPE_OPTIONS.map(({ value, label }) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={workTypes.has(value)}
                        onChange={() => toggleWorkType(value)}
                        className="h-4 w-4 rounded accent-[#0f9f92]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Refresh button */}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                disabled={loadingMatches || !resumeFileName}
                onClick={() => refreshMatches(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#0f9f92] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0b8f83] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMatches ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loadingMatches ? "Searching…" : "Refresh matches"}
              </button>
            </div>
          </div>

          {/* Notices */}
          {matchError && (
            <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{matchError}</p>
          )}
          {!matchError && matchNotice && (
            <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-medium text-[#0f8f83]">{matchNotice}</p>
          )}

          {/* Job cards */}
          <div className="space-y-2.5">
            {!resumeFileName ? (
              <div className="rounded-[1.75rem] bg-white/78 px-6 py-12 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
                <h3 className="mt-4 text-xl font-semibold text-[#14213d]">Add your resume to unlock matches.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Once your master resume is saved, ApplyHQ can refresh your best job matches automatically.
                </p>
                <Link href="/documents" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white">
                  Add documents <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : loadingMatches && matches.length === 0 ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-[1.6rem] bg-white/70" />
                ))}
              </>
            ) : matches.length === 0 ? (
              <div className="rounded-[1.75rem] bg-white/78 px-6 py-12 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
                <h3 className="mt-4 text-xl font-semibold text-[#14213d]">No fresh matches just yet.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Try refreshing, or update your keywords to give the search a clearer signal.
                </p>
              </div>
            ) : (
              <>
                {(showAllMatches ? matches : matches.slice(0, 5)).map((job) => (
                  <GrabbedMatchCard
                    key={job.id}
                    job={job}
                    importedApplicationId={imported[job.id] ?? importedByUrl[job.jobUrl]}
                    importing={Boolean(importing[job.id])}
                    onImport={importJob}
                  />
                ))}
                {matches.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMatches((v) => !v)}
                    className="mx-auto flex items-center gap-2 rounded-full bg-white/75 px-5 py-3 text-sm font-semibold text-[#0f8f83] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    {showAllMatches ? "Show fewer" : `Show ${matches.length - 5} more matches`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
