"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Loader2, MapPin, Search, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Filter = "All" | ApplicationStatus;
type SummaryState = { summary?: string; loading?: boolean; error?: string };
type SummaryStateMap = Record<string, SummaryState>;

const STATUSES: ApplicationStatus[] = ["New", "Ready", "Applied", "Interview", "Rejected"];
const EMPTY = "-";

function scoreStyle(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-500";
  if (score >= 85) return "bg-[#d4ccff] text-[#1a00cc]";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  if (score >= 50) return "bg-violet-100 text-violet-700";
  return "bg-rose-50 text-rose-600";
}

function companyInitial(company?: string | null) {
  return (company?.trim()?.[0] ?? "A").toUpperCase();
}

function shortDate(value: string | null) {
  if (!value) return EMPTY;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(value));
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const label = days < 0 ? "Closed" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${shortDate(expiresAt)}`;
  const cls = days < 0
    ? "bg-slate-100 text-slate-400"
    : days <= 3
    ? "bg-rose-100 text-rose-700 font-semibold"
    : days <= 7
    ? "bg-amber-100 text-amber-700 font-semibold"
    : "bg-slate-100 text-slate-600";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function summaryBullets(text?: string | null) {
  const clean = text?.trim();
  if (!clean) return [];

  const explicitBullets = clean
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (explicitBullets.length >= 2) return explicitBullets.slice(0, 3);

  return clean
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function SummaryPanel({ state, fallbackSummary }: { state?: SummaryState; fallbackSummary?: string | null }) {
  const summary = state?.summary ?? fallbackSummary ?? "";
  const bullets = summaryBullets(summary);

  if (state?.loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#2200ff]" />
        Summarising job description...
      </div>
    );
  }

  if (state?.error) {
    return (
      <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-600">
        {state.error}
      </div>
    );
  }

  if (bullets.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
        No summary yet. Expand again to generate one from the job description.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Job summary</p>
      <ul className="space-y-2">
        {bullets.map((bullet, index) => (
          <li key={`${bullet}-${index}`} className="flex gap-2.5 text-sm leading-6 text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2200ff]/50" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const statusPill: Record<string, string> = {
  New: "bg-sky-50 text-sky-700",
  Ready: "bg-emerald-50 text-emerald-700",
  Applied: "bg-amber-50 text-amber-700",
  Interview: "bg-orange-50 text-orange-700",
  Rejected: "bg-rose-50 text-rose-600",
};

type RowProps = {
  application: ApplicationWithJob;
  expanded: boolean;
  summaryState?: SummaryState;
  onToggleSummary: (application: ApplicationWithJob) => void;
};

function MobileCard({ application, expanded, summaryState, onToggleSummary }: RowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const job = application.jobs;

  async function del() {
    if (!window.confirm(`Delete ${job?.title ?? "this application"}?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert((await res.json().catch(() => null))?.error ?? "Could not delete.");
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-[1.4rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4ccff] to-violet-50 text-sm font-bold text-[#2200ff]">
          {companyInitial(job?.company)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{job?.title ?? "Untitled role"}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{job?.company}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${scoreStyle(application.match_score)}`}>
          {application.match_score === null ? EMPTY : `${application.match_score}%`}
        </span>
      </div>

      {expanded ? (
        <div className="mt-3">
          <SummaryPanel state={summaryState} fallbackSummary={application.role_summary} />
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleSummary(application)}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${
            expanded ? "bg-[#ece8ff] text-[#2200ff]" : "bg-slate-50 text-slate-600 hover:text-[#2200ff]"
          }`}
        >
          Summary
          <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
        </button>
        <Link href={`/applications/${application.id}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2200ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a00cc]">
          View <ArrowRight className="h-4 w-4" />
        </Link>
        <button type="button" onClick={del} disabled={deleting} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:text-rose-500 disabled:opacity-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DesktopRow({ application, expanded, summaryState, onToggleSummary }: RowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const job = application.jobs;
  const score = application.match_score;
  const status = application.status ?? "New";

  const tdBase = "bg-white py-3.5 transition-colors group-hover:bg-slate-50";

  async function del() {
    if (!window.confirm(`Delete ${job?.title ?? "this application"}?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert((await res.json().catch(() => null))?.error ?? "Could not delete.");
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <tr className="group">
        <td className={`${tdBase} rounded-l-[1.2rem] pl-4 pr-3`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4ccff] to-violet-50 text-sm font-bold text-[#2200ff]">
              {companyInitial(job?.company)}
            </div>
            <div className="min-w-0">
              <Link href={`/applications/${application.id}`} className="block line-clamp-2 font-semibold text-slate-900 transition group-hover:text-[#2200ff]">
                {job?.title ?? "Untitled role"}
              </Link>
              <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                <span>{job?.company}</span>
                {job?.location && (
                  <>
                    <span className="text-slate-300">-</span>
                    <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3 text-slate-400" />{job.location}</span>
                  </>
                )}
                {application.location_type && application.location_type !== "Not specified" && (
                  <><span className="text-slate-300">-</span><span>{application.location_type}</span></>
                )}
              </p>
            </div>
          </div>
        </td>

        <td className={`${tdBase} px-2 text-center`}>
          <span className={`inline-block rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${scoreStyle(score)}`}>
            {score === null ? EMPTY : `${score}%`}
          </span>
        </td>

        <td className={`${tdBase} px-2 text-sm text-slate-600`}>
          {application.hiring_manager || <span className="text-slate-300">{EMPTY}</span>}
        </td>

        <td className={`${tdBase} px-2 text-sm text-slate-600`}>
          {job?.salary || <span className="text-slate-300">{EMPTY}</span>}
        </td>

        <td className={`${tdBase} px-2 text-sm text-slate-600`}>
          {application.applied_at ? shortDate(application.applied_at) : <span className="text-slate-300">{EMPTY}</span>}
        </td>

        <td className={`${tdBase} px-2 text-sm`}>
          {job?.expires_at ? (
            <ExpiryBadge expiresAt={job.expires_at} />
          ) : (
            <span className="text-slate-300">{EMPTY}</span>
          )}
        </td>

        <td className={`${tdBase} px-2`}>
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill[status] ?? "bg-slate-100 text-slate-600"}`}>
            {status}
          </span>
        </td>

        <td className={`${tdBase} rounded-r-[1.2rem] pl-2 pr-4`}>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onToggleSummary(application)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                expanded ? "bg-[#ece8ff] text-[#2200ff]" : "text-slate-300 hover:bg-slate-50 hover:text-[#2200ff]"
              }`}
              title={expanded ? "Hide summary" : "Show summary"}
              aria-label={expanded ? "Hide job summary" : "Show job summary"}
              aria-expanded={expanded}
            >
              <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
            </button>
            <Link href={`/applications/${application.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a00cc]">
              View
            </Link>
            <button type="button" onClick={del} disabled={deleting} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:text-rose-500 disabled:opacity-50" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr>
          <td colSpan={7} className="px-4 pb-2">
            <SummaryPanel state={summaryState} fallbackSummary={application.role_summary} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function ApplicationsFilter({ applications }: { applications: ApplicationWithJob[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [summaries, setSummaries] = useState<SummaryStateMap>({});

  async function loadSummary(application: ApplicationWithJob) {
    if (application.role_summary?.trim() || summaries[application.id]?.summary || summaries[application.id]?.loading) return;

    setSummaries((current) => ({
      ...current,
      [application.id]: { ...current[application.id], loading: true, error: undefined },
    }));

    try {
      const res = await fetch(`/api/applications/${application.id}/summarise-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "bullets", save: true }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSummaries((current) => ({
          ...current,
          [application.id]: { loading: false, error: data?.error ?? "Could not summarise this job." },
        }));
        return;
      }

      setSummaries((current) => ({
        ...current,
        [application.id]: { loading: false, summary: data?.summary ?? "" },
      }));
    } catch {
      setSummaries((current) => ({
        ...current,
        [application.id]: { loading: false, error: "Network error. Try again." },
      }));
    }
  }

  function toggleSummary(application: ApplicationWithJob) {
    const nextExpanded = !expandedIds.has(application.id);

    setExpandedIds((current) => {
      const next = new Set(current);
      if (nextExpanded) next.add(application.id);
      else next.delete(application.id);
      return next;
    });

    if (nextExpanded) {
      void loadSummary(application);
    }
  }

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<ApplicationStatus, number>> = {};
    for (const app of applications) {
      const s = (app.status ?? "New") as ApplicationStatus;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((app) => {
      if (filter !== "All" && app.status !== filter) return false;
      if (!q) return true;
      const text = [app.jobs?.title, app.jobs?.company, app.jobs?.location, app.status].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [applications, filter, query]);

  if (applications.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-slate-100 bg-white px-6 py-14 text-center shadow-sm">
        <Sparkles className="mx-auto h-10 w-10 text-[#2200ff]/60" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">No applications yet.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Choose a fresh match from Home or paste a job link to start your first tailored application.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1a00cc]">
          Go to Home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-[1.6rem] border border-slate-100 bg-white p-3 shadow-sm md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-100 focus-within:ring-[#d4ccff]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles" className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-slate-400 md:text-sm" type="search" />
          </label>
          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </span>
            <button type="button" onClick={() => setFilter("All")} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 ${filter === "All" ? "bg-[#2200ff] text-white shadow-[0_8px_20px_rgba(34,0,255,0.2)]" : "bg-white text-slate-600 ring-1 ring-slate-100 hover:text-[#2200ff]"}`}>
              All
            </button>
            {STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 ${filter === s ? "bg-[#2200ff] text-white shadow-[0_8px_20px_rgba(34,0,255,0.2)]" : "bg-white text-slate-600 ring-1 ring-slate-100 hover:text-[#2200ff]"}`}>
                <span className="mr-1 tabular-nums">{statusCounts[s] ?? 0}</span>{s}
              </button>
            ))}
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="min-h-11 w-full appearance-none rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-100 md:hidden">
            <option value="All">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusCounts[s] ?? 0} {s}</option>)}
          </select>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">Showing {filtered.length} of {applications.length} applications</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
          <Search className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Nothing matches that filter.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Try another status or clear the search.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {filtered.map((app) => (
              <MobileCard
                key={app.id}
                application={app}
                expanded={expandedIds.has(app.id)}
                summaryState={summaries[app.id]}
                onToggleSummary={toggleSummary}
              />
            ))}
          </div>

          <table className="hidden w-full border-separate border-spacing-y-2 lg:table">
            <colgroup>
              <col />
              <col className="w-[90px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[85px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[125px]" />
            </colgroup>
            <thead>
              <tr>
                <th className="pb-1 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400" />
                <th className="pb-1 px-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Match</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Recruiter</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Salary</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Applied</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Closes</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="pb-1 pr-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <DesktopRow
                  key={app.id}
                  application={app}
                  expanded={expandedIds.has(app.id)}
                  summaryState={summaries[app.id]}
                  onToggleSummary={toggleSummary}
                />
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
