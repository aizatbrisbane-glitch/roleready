"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Lightbulb,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Sprout,
  Target,
} from "lucide-react";
import { QuickApplyForm } from "@/components/QuickApplyForm";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import type { GrabResult } from "@/app/api/grab/route";
import type { ApplicationWithJob, CachedGrabbedJob } from "@/types/database";

type Props = {
  applications: ApplicationWithJob[];
  resumeFileName: string | null;
  coverLetterFileName: string | null;
  userName?: string | null;
  grabbedMatches: CachedGrabbedJob[];
  grabbedMatchesStale: boolean;
};

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

function profileStrength({
  resumeFileName,
  coverLetterFileName,
  applications,
}: {
  resumeFileName: string | null;
  coverLetterFileName: string | null;
  applications: ApplicationWithJob[];
}) {
  let score = 38;
  if (resumeFileName) score += 22;
  if (coverLetterFileName) score += 14;
  if (applications.length > 0) score += 10;
  if (applications.some((app) => app.match_score !== null)) score += 8;
  if (applications.some((app) => app.tailored_resume && app.cover_letter)) score += 8;
  return Math.min(score, 100);
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
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function freshnessLabel(fetchedAt?: string) {
  if (!fetchedAt) return "Ready to refresh";
  const fetched = new Date(fetchedAt);
  const today = new Date();
  if (
    fetched.getDate() === today.getDate() &&
    fetched.getMonth() === today.getMonth() &&
    fetched.getFullYear() === today.getFullYear()
  ) {
    return "Updated today";
  }
  return "Ready for a fresh scan";
}

function matchPillClass(score: number) {
  if (score >= 85) return "bg-teal-100 text-[#0f8f83]";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  if (score >= 50) return "bg-violet-100 text-violet-700";
  return "bg-rose-50 text-rose-600";
}

const dailyTips = [
  "Customise your cover letter opening to match the companyâ€™s mission.",
  "Add measurable outcomes to your resume bullets wherever possible.",
  "Mirror 3â€“5 important keywords from the job ad in your resume.",
  "Keep your resume summary specific to the role youâ€™re applying for.",
  "Send fewer applications, but make each one sharper.",
  "Check the first 6 seconds of your resume: title, summary, and top skills.",
  "Use the hiring managerâ€™s language, not generic career buzzwords.",
  "Save a short story for interviews that shows how you solved a real problem.",
  "Before applying, check whether your top skills match the first half of the job ad.",
  "Replace vague words like responsible for with action verbs and outcomes.",
];

function getTipOfTheDay() {
  const start = new Date("2026-01-01T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  return dailyTips[Math.abs(days) % dailyTips.length];
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
  const [expanded, setExpanded] = useState(false);
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const label = matchLabel(job.matchScore);

  return (
    <article className="group max-w-full overflow-hidden rounded-[1.6rem] bg-white/82 p-4 shadow-[0_16px_54px_rgba(20,33,61,0.055)] transition duration-300 hover:bg-white md:p-5 md:hover:-translate-y-1 md:hover:shadow-[0_24px_70px_rgba(20,33,61,0.08)]">
      <div className="md:hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-amber-50 text-base font-semibold text-[#0f8f83]">
            {(job.company?.trim()?.[0] ?? "A").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-[#14213d]">{job.title}</h3>
            <p className="mt-1 truncate text-base text-slate-600">{job.company}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-3.5 py-2 text-sm font-semibold ${matchPillClass(job.matchScore)}`}>
            {label}
          </span>
          <span className="inline-flex rounded-full bg-teal-50 px-3.5 py-2 text-sm font-semibold text-[#0f8f83]">
            {job.matchScore}% match
          </span>
        </div>

        {expanded ? (
          <div className="mt-4 rounded-2xl bg-[#fffaf4] p-4 text-sm leading-6 text-slate-600">
            {job.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {job.location}
              </p>
            ) : null}
            {salary ? <p className="mt-2">{salary}</p> : null}
            {job.matchReason ? <p className="mt-3">{job.matchReason}</p> : null}
            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-semibold text-[#0f8f83]">
              View original job <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          {importedApplicationId ? (
            <Link
              href={`/applications/${importedApplicationId}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)]"
            >
              Open application <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={importing}
              onClick={() => onImport(job)}
              type="button"
            >
              {importing ? "Starting..." : "Tailor & Apply"} <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"
            onClick={() => setExpanded((current) => !current)}
            type="button"
            aria-expanded={expanded}
          >
            <ChevronDown className={`h-5 w-5 transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <div className="hidden flex-col gap-4 md:flex lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-amber-50 text-lg font-semibold text-[#0f8f83]">
            {(job.company?.trim()?.[0] ?? "A").toUpperCase()}
          </div>
          <div className="min-w-0">
            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="group/link inline-flex max-w-full items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-[#14213d] transition group-hover:text-[#0f8f83]">
                {job.title}
              </h3>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 transition group-hover/link:text-[#0f8f83]" />
            </a>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-slate-600">
              <span>{job.company}</span>
              {job.location ? (
                <>
                  <span className="text-slate-300">â€¢</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {job.location}
                  </span>
                </>
              ) : null}
              {salary ? (
                <>
                  <span className="text-slate-300">â€¢</span>
                  <span>{salary}</span>
                </>
              ) : null}
            </p>
            {job.matchReason ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{job.matchReason}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="min-w-32">
            <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold tabular-nums ${matchPillClass(job.matchScore)}`}>
              {job.matchScore}% Match
            </span>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </div>

          {importedApplicationId ? (
            <Link
              href={`/applications/${importedApplicationId}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0b8f83]"
            >
              Open application <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0b8f83] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={importing}
              onClick={() => onImport(job)}
              type="button"
            >
              {importing ? "Starting..." : "Tailor & Apply"} <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#14213d] shadow-[0_10px_30px_rgba(20,33,61,0.08)] transition hover:-translate-y-0.5 hover:text-[#0f8f83]"
            title="View original job"
          >
            <Bookmark className="h-4.5 w-4.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardTabs({
  applications,
  resumeFileName,
  coverLetterFileName,
  userName,
  grabbedMatches,
  grabbedMatchesStale,
}: Props) {
  const router = useRouter();
  const name = firstName(userName);
  const [matches, setMatches] = useState<GrabResult[]>(() => grabbedMatches.map(cachedMatchToGrabResult));
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchNotice, setMatchNotice] = useState("");
  const [lastSearchQuery, setLastSearchQuery] = useState(grabbedMatches[0]?.search_query ?? "");
  const [keywordQuery, setKeywordQuery] = useState(grabbedMatches[0]?.search_query ?? "");
  const [lastFetchedAt, setLastFetchedAt] = useState<string | undefined>(grabbedMatches[0]?.fetched_at);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [imported, setImported] = useState<Record<string, string>>({});
  const [showAllMatches, setShowAllMatches] = useState(false);

  const readyCount = applications.filter((app) => app.tailored_resume && app.cover_letter).length;
  const sentThisMonth = applications.filter((app) => {
    if (!app.applied_at) return false;
    const applied = new Date(app.applied_at);
    const now = new Date();
    return applied.getMonth() === now.getMonth() && applied.getFullYear() === now.getFullYear();
  }).length;
  const strength = profileStrength({ resumeFileName, coverLetterFileName, applications });
  const tipOfTheDay = getTipOfTheDay();
  const strongMatches = matches.filter((job) => job.matchScore >= 80).length;
  const importedByUrl = useMemo(() => {
    const map: Record<string, string> = {};
    for (const app of applications) {
      if (app.jobs?.job_url) map[app.jobs.job_url] = app.id;
    }
    return map;
  }, [applications]);

  async function refreshMatches(force = false) {
    if (!resumeFileName) return;
    setLoadingMatches(true);
    setMatchError("");
    setMatchNotice(force ? "Searching Adzuna again..." : "Checking todayâ€™s matches...");

    try {
      const params = new URLSearchParams();
      if (force) params.set("refresh", "true");
      if (keywordQuery.trim()) params.set("q", keywordQuery.trim());
      const queryString = params.toString();
      const response = await fetch(`/api/grab${queryString ? `?${queryString}` : ""}`);
      const payload = await response.json();

      if (!response.ok) {
        setMatchError(payload.error ?? "Couldnâ€™t refresh matches just now.");
        return;
      }

      const nextMatches = payload.jobs ?? [];
      setMatches(nextMatches);
      setLastFetchedAt(payload.fetchedAt ?? payload.jobs?.[0]?.fetchedAt);
      setLastSearchQuery(payload.searchQuery ?? "");
      setKeywordQuery(payload.searchQuery ?? keywordQuery);
      setShowAllMatches(false);
      setMatchNotice(
        nextMatches.length > 0
          ? `Found ${nextMatches.length} fresh ${nextMatches.length === 1 ? "match" : "matches"}${payload.searchQuery ? ` for â€œ${payload.searchQuery}â€` : ""}.`
          : `Checked Adzuna${payload.searchQuery ? ` for â€œ${payload.searchQuery}â€` : â€œâ€}, but didnâ€™t find fresh matches yet.`
      );
    } catch {
      setMatchError("Couldnâ€™t refresh matches just now.");
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
          salary: formatSalary(job.salaryMin, job.salaryMax),
          jobUrl: job.jobUrl,
          description: job.description,
          matchScore: job.matchScore,
          matchReason: job.matchReason,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.applicationId) {
        setMatchError(payload.error ?? "Couldnâ€™t start that application.");
        return;
      }

      setImported((prev) => ({ ...prev, [job.id]: payload.applicationId }));
      router.push(`/applications/${payload.applicationId}`);
      router.refresh();
    } catch {
      setMatchError("Couldnâ€™t start that application.");
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

  return (
    <div className="mx-auto max-w-[1520px] overflow-x-clip">
      <div className="mb-5 flex flex-col gap-3 md:mb-10 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
            {getGreeting()}{name ? `, ${name}` : ""} ðŸ‘‹
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-600 md:mt-3 md:text-lg md:leading-8">
            Let&apos;s get you closer to your next opportunity.
          </p>
        </div>
        <Link
          href="/profile"
          className="hidden w-fit items-center gap-2 rounded-full bg-white/75 px-5 py-3 text-sm font-semibold text-[#0f8f83] shadow-[0_16px_42px_rgba(20,33,61,0.07)] transition duration-300 hover:-translate-y-1 hover:bg-white md:inline-flex"
        >
          Improve profile <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6 md:space-y-8">
          <OnboardingChecklist
            hasResume={!!resumeFileName}
            hasApplication={applications.length > 0}
            hasGeneratedDoc={applications.some((app) => !!(app.tailored_resume && app.cover_letter))}
          />
          <QuickApplyForm resumeFileName={resumeFileName} coverLetterFileName={coverLetterFileName} />

          <section className="hidden overflow-hidden rounded-[2rem] bg-white/78 p-5 shadow-[0_24px_80px_rgba(20,33,61,0.07)] backdrop-blur md:block md:p-8">
            <div className="grid gap-7 md:grid-cols-[150px_minmax(0,1fr)] md:items-center">
              <div className="relative mx-auto flex h-32 w-32 items-end justify-center overflow-hidden rounded-full bg-gradient-to-b from-amber-50 to-teal-50">
                <div className="absolute bottom-0 h-14 w-28 rounded-t-full bg-teal-200/80" />
                <Sprout className="relative mb-8 h-12 w-12 text-[#0f9f92]" />
                <div className="absolute right-8 top-7 h-4 w-4 rounded-full bg-amber-200" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#14213d]">
                  You&apos;re making great progress ðŸŒ±
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92]">
                      <Target className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold text-[#14213d]">{strongMatches}</p>
                      <p className="text-sm leading-5 text-slate-600">strong matches today</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold text-[#14213d]">{readyCount}</p>
                      <p className="text-sm leading-5 text-slate-600">applications ready to send</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold text-[#14213d]">{sentThisMonth}</p>
                      <p className="text-sm leading-5 text-slate-600">applications sent this month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-[#0f8f83] md:text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  {freshnessLabel(lastFetchedAt)}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#14213d]">Fresh opportunities for you</h2>
                <p className="mt-1 text-base leading-7 text-slate-600 md:text-sm md:leading-normal">Top matches discovered from live job boards and scored against your resume.</p>
              </div>
              <div className="min-w-0 flex flex-col gap-3 sm:items-end">
                <label className="w-full sm:w-80">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Search keywords</span>
                  <input
                    className="w-full rounded-full bg-white/80 px-4 py-3 text-sm text-[#14213d] shadow-[0_12px_34px_rgba(20,33,61,0.05)] outline-none placeholder:text-slate-400 focus:ring-3 focus:ring-teal-100"
                    placeholder="e.g. governance risk manager"
                    value={keywordQuery}
                    onChange={(event) => setKeywordQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !loadingMatches && resumeFileName) {
                        void refreshMatches(true);
                      }
                    }}
                  />
                </label>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/75 px-5 py-3 text-sm font-semibold text-[#0f8f83] shadow-[0_16px_42px_rgba(20,33,61,0.07)] transition duration-300 hover:-translate-y-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                  disabled={loadingMatches || !resumeFileName}
                  onClick={() => refreshMatches(true)}
                  type="button"
                >
                  {loadingMatches ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {loadingMatches ? "Searching..." : "Refresh matches"}
                </button>
              </div>
            </div>

            {matchError ? (
              <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{matchError}</p>
            ) : null}
            {!matchError && matchNotice ? (
              <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-[#0f8f83]">{matchNotice}</p>
            ) : null}

            <div className="space-y-3">
              {!resumeFileName ? (
                <div className="rounded-[1.75rem] bg-white/78 px-6 py-12 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
                  <Target className="mx-auto h-10 w-10 text-teal-500" />
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
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-32 animate-pulse rounded-[1.6rem] bg-white/70 shadow-[0_16px_54px_rgba(20,33,61,0.04)]" />
                  ))}
                </>
              ) : matches.length === 0 ? (
                <div className="rounded-[1.75rem] bg-white/78 px-6 py-12 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
                  <Sparkles className="mx-auto h-10 w-10 text-teal-500" />
                  <h3 className="mt-4 text-xl font-semibold text-[#14213d]">No fresh matches just yet.</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    {lastSearchQuery
                      ? `We checked for â€œ${lastSearchQuery}â€. Try refreshing later, or add more target keywords to your resume.`
                      : "Try refreshing, or add more keywords to your resume so the search has a clearer signal."}
                  </p>
                </div>
              ) : (
                <>
                  {(showAllMatches ? matches : matches.slice(0, 3)).map((job) => (
                    <GrabbedMatchCard
                      key={job.id}
                      job={job}
                      importedApplicationId={imported[job.id] ?? importedByUrl[job.jobUrl]}
                      importing={Boolean(importing[job.id])}
                      onImport={importJob}
                    />
                  ))}
                  {matches.length > 3 ? (
                    <button
                      className="mx-auto flex items-center gap-2 rounded-full bg-white/75 px-5 py-3 text-sm font-semibold text-[#0f8f83] shadow-[0_14px_38px_rgba(20,33,61,0.06)] transition duration-300 hover:-translate-y-1 hover:bg-white"
                      onClick={() => setShowAllMatches((current) => !current)}
                      type="button"
                    >
                      {showAllMatches ? "Show top 3" : `Show ${matches.length - 3} more matches`}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </section>

        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-[1.75rem] bg-white/78 p-6 shadow-[0_20px_70px_rgba(20,33,61,0.07)]">
            <h2 className="text-xl font-semibold text-[#14213d]">Your confidence is building ðŸ'ª</h2>
            <div className="mt-6 flex items-center gap-5">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#0f9f92_0_var(--strength),#d7f4ef_var(--strength)_100%)] p-3" style={{ "--strength": `${strength}%` } as React.CSSProperties}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-semibold text-[#14213d]">
                  {strength}%
                </div>
              </div>
              <div>
                <p className="font-medium text-[#14213d]">Profile strength</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Nice work. A stronger profile leads to better matches.
                </p>
              </div>
            </div>
            <Link href="/profile" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f8f83]">
              Improve profile <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-[1.75rem] bg-[#fff8e8] p-6 shadow-[0_18px_60px_rgba(20,33,61,0.05)]">
            <div className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92]">
                <Lightbulb className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#14213d]">Tip of the day</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {tipOfTheDay}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] bg-gradient-to-br from-white to-amber-50 p-6 shadow-[0_18px_60px_rgba(20,33,61,0.05)]">
            <p className="text-4xl font-serif text-amber-400">â€œ</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Every application is a step closer to the right opportunity.
            </p>
            <p className="mt-4 font-semibold text-[#14213d]">You&apos;ve got this! âœ¨</p>
          </section>

          <section className="rounded-[1.75rem] bg-teal-50/80 p-6 shadow-[0_18px_60px_rgba(20,33,61,0.05)]">
            <div className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0f9f92]">
                <HeartHandshake className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#14213d]">Need help getting started?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Explore your profile, documents, and saved applications anytime.
                </p>
                <Link href="/more" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0f8f83]">
                  Open More <BookOpen className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

