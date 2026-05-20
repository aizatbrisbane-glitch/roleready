"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ApplicationRow } from "@/components/ApplicationRow";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Filter = "All" | ApplicationStatus;

type Props = {
  applications: ApplicationWithJob[];
};

const filters: Filter[] = ["All", "New", "Reviewed", "Ready", "Applied", "Interview", "Rejected"];

function matchLabel(score: number | null) {
  if (score === null) return "Worth reviewing";
  if (score >= 85) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Worth reviewing";
  return "Needs tailoring";
}

export function ApplicationsFilter({ applications }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const statusMatches = filter === "All" || application.status === filter;
      if (!statusMatches) return false;
      if (!normalizedQuery) return true;

      const job = application.jobs;
      const searchable = [job?.title, job?.company, job?.location, application.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [applications, filter, query]);

  if (applications.length === 0) {
    return (
      <div className="rounded-[1.75rem] bg-white/78 px-6 py-14 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
        <Sparkles className="mx-auto h-10 w-10 text-teal-500" />
        <h2 className="mt-4 text-2xl font-semibold text-[#14213d]">No applications yet.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Choose a fresh match from Home or paste a job link to start your first tailored application.
        </p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white">
          Go to Home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="max-w-full rounded-[1.6rem] bg-white/82 p-3 shadow-[0_16px_54px_rgba(20,33,61,0.055)] md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl bg-[#fffaf4] px-4 text-base text-slate-600 ring-1 ring-stone-100 focus-within:ring-[#0f9f92]/30 md:min-h-12 md:text-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roles"
              className="min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none placeholder:text-slate-400 md:text-sm"
              type="search"
            />
          </label>

          <label className="relative block sm:hidden">
            <span className="sr-only">Filter by status</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              className="min-h-[52px] w-full appearance-none rounded-2xl bg-[#fffaf4] px-4 pr-11 text-[16px] font-semibold text-[#14213d] outline-none ring-1 ring-stone-100 focus:ring-[#0f9f92]/30"
            >
              {filters.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All statuses" : item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>

          <div className="hidden flex-wrap items-center gap-2 sm:flex lg:gap-2">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[#0f8f83] lg:flex">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`min-h-10 min-w-0 rounded-full px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 sm:px-4 ${
                  filter === item ? "bg-[#0f9f92] text-white shadow-[0_12px_28px_rgba(15,159,146,0.18)]" : "bg-white text-slate-600 ring-1 ring-stone-100 hover:text-[#0f8f83]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Showing {filteredApplications.length} of {applications.length} applications
        </p>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="rounded-[1.75rem] bg-white/78 px-6 py-12 text-center shadow-[0_18px_60px_rgba(20,33,61,0.06)]">
          <Search className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold text-[#14213d]">Nothing matches that filter.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Try another status or clear the search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => (
            <ApplicationRow
              key={application.id}
              application={application}
              matchLabel={matchLabel(application.match_score)}
              ctaLabel="Open application"
            />
          ))}
        </div>
      )}
    </section>
  );
}
