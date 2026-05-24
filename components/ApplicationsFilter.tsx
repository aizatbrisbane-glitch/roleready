"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Search, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Filter = "All" | ApplicationStatus;
const STATUSES: ApplicationStatus[] = ["New", "Reviewed", "Ready", "Applied", "Interview", "Rejected"];

function scoreStyle(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-500";
  if (score >= 85) return "bg-teal-100 text-[#0f8f83]";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  if (score >= 50) return "bg-violet-100 text-violet-700";
  return "bg-rose-50 text-rose-600";
}

function companyInitial(company?: string | null) {
  return (company?.trim()?.[0] ?? "A").toUpperCase();
}

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(value));
}

function MobileCard({ application }: { application: ApplicationWithJob }) {
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
    <div className="rounded-[1.4rem] bg-white/82 p-4 shadow-[0_8px_30px_rgba(20,33,61,0.05)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-amber-50 text-sm font-bold text-[#0f8f83]">
          {companyInitial(job?.company)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#14213d]">{job?.title ?? "Untitled role"}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{job?.company}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${scoreStyle(application.match_score)}`}>
          {application.match_score === null ? "—" : `${application.match_score}%`}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Link href={`/applications/${application.id}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-4 py-2.5 text-sm font-semibold text-white">
          View <ArrowRight className="h-4 w-4" />
        </Link>
        <button type="button" onClick={del} disabled={deleting} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:text-rose-500 disabled:opacity-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const statusPill: Record<string, string> = {
  New:       "bg-sky-50 text-sky-700",
  Reviewed:  "bg-violet-50 text-violet-700",
  Ready:     "bg-teal-50 text-teal-700",
  Applied:   "bg-amber-50 text-amber-700",
  Interview: "bg-orange-50 text-orange-700",
  Rejected:  "bg-rose-50 text-rose-600",
};

function DesktopRow({ application }: { application: ApplicationWithJob }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const job = application.jobs;
  const score = application.match_score;
  const status = application.status ?? "New";

  const tdBase = "bg-white/82 py-3.5 transition-colors group-hover:bg-white";

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
    <tr className="group">
      {/* Title */}
      <td className={`${tdBase} rounded-l-[1.2rem] pl-4 pr-3`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-amber-50 text-sm font-bold text-[#0f8f83]">
            {companyInitial(job?.company)}
          </div>
          <div className="min-w-0">
            <Link href={`/applications/${application.id}`} className="block line-clamp-2 font-semibold text-[#14213d] transition group-hover:text-[#0f8f83]">
              {job?.title ?? "Untitled role"}
            </Link>
            <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
              <span>{job?.company}</span>
              {job?.location && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3 text-slate-400" />{job.location}</span>
                </>
              )}
              {application.location_type && application.location_type !== "Not specified" && (
                <><span className="text-slate-300">•</span><span>{application.location_type}</span></>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Match */}
      <td className={`${tdBase} px-2 text-center`}>
        <span className={`inline-block rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${scoreStyle(score)}`}>
          {score === null ? "—" : `${score}%`}
        </span>
      </td>

      {/* Recruiter */}
      <td className={`${tdBase} px-2 text-sm text-slate-600`}>
        {application.hiring_manager || <span className="text-slate-300">—</span>}
      </td>

      {/* Salary */}
      <td className={`${tdBase} px-2 text-sm text-slate-600`}>
        {job?.salary || <span className="text-slate-300">—</span>}
      </td>

      {/* Applied */}
      <td className={`${tdBase} px-2 text-sm text-slate-600`}>
        {shortDate(application.created_at)}
      </td>

      {/* Status */}
      <td className={`${tdBase} px-2`}>
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill[status] ?? "bg-slate-100 text-slate-600"}`}>
          {status}
        </span>
      </td>

      {/* Actions */}
      <td className={`${tdBase} rounded-r-[1.2rem] pl-2 pr-4`}>
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/applications/${application.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#0f9f92] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0b8f83]">
            View
          </Link>
          <button type="button" onClick={del} disabled={deleting} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:text-rose-500 disabled:opacity-50" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ApplicationsFilter({ applications }: { applications: ApplicationWithJob[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

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
      <div className="rounded-[1.75rem] bg-white/78 px-6 py-14 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
        <Sparkles className="mx-auto h-10 w-10 text-teal-500" />
        <h2 className="mt-4 text-2xl font-semibold text-[#14213d]">No applications yet.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Choose a fresh match from Home or paste a job link to start your first tailored application.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white">
          Go to Home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {/* Search + filter bar */}
      <div className="rounded-[1.6rem] bg-white/82 p-3 shadow-[0_16px_54px_rgba(20,33,61,0.055)] md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl bg-[#fffaf4] px-4 ring-1 ring-stone-100 focus-within:ring-[#0f9f92]/30">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles" className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-slate-400 md:text-sm" type="search" />
          </label>
          {/* Desktop filter pills */}
          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </span>
            <button type="button" onClick={() => setFilter("All")} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 ${filter === "All" ? "bg-[#0f9f92] text-white shadow-[0_8px_20px_rgba(15,159,146,0.2)]" : "bg-white text-slate-600 ring-1 ring-stone-100 hover:text-[#0f8f83]"}`}>
              All
            </button>
            {STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 ${filter === s ? "bg-[#0f9f92] text-white shadow-[0_8px_20px_rgba(15,159,146,0.2)]" : "bg-white text-slate-600 ring-1 ring-stone-100 hover:text-[#0f8f83]"}`}>
                <span className="mr-1 tabular-nums">{statusCounts[s] ?? 0}</span>{s}
              </button>
            ))}
          </div>
          {/* Mobile filter select */}
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="min-h-11 w-full appearance-none rounded-2xl bg-[#fffaf4] px-4 text-sm font-semibold text-[#14213d] outline-none ring-1 ring-stone-100 md:hidden">
            <option value="All">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusCounts[s] ?? 0} {s}</option>)}
          </select>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">Showing {filtered.length} of {applications.length} applications</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.75rem] bg-white/78 px-6 py-12 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
          <Search className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold text-[#14213d]">Nothing matches that filter.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Try another status or clear the search.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {filtered.map((app) => <MobileCard key={app.id} application={app} />)}
          </div>

          {/* Desktop table */}
          <table className="hidden w-full border-separate border-spacing-y-2 lg:table">
            <colgroup>
              <col />
              <col className="w-[90px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[85px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th className="pb-1 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400" />
                <th className="pb-1 px-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Match</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Recruiter</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Salary</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Applied</th>
                <th className="pb-1 px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="pb-1 pr-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => <DesktopRow key={app.id} application={app} />)}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
