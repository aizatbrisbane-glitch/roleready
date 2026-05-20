"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, CalendarCheck, ChevronDown, Clock3, MapPin, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { ApplicationWithJob } from "@/types/database";

type Props = {
  application: ApplicationWithJob;
  matchLabel?: string;
  ctaLabel?: string;
};

function scoreClass(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-600";
  if (score >= 85) return "bg-teal-100 text-[#0f8f83]";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  if (score >= 50) return "bg-violet-100 text-violet-700";
  return "bg-rose-50 text-rose-600";
}

function companyInitial(company?: string | null) {
  return (company?.trim()?.[0] ?? "A").toUpperCase();
}

function statusTone(application: ApplicationWithJob) {
  if (application.status === "Rejected") {
    return {
      label: "Rejected",
      detail: "Closed outcome",
      className: "bg-rose-50 text-rose-700",
      icon: XCircle,
    };
  }

  if (application.status === "Interview") {
    return {
      label: "Interview",
      detail: "Next step active",
      className: "bg-orange-50 text-orange-700",
      icon: CalendarCheck,
    };
  }

  if (application.applied_at || application.status === "Applied") {
    return {
      label: "Applied",
      detail: application.applied_at ? formatDate(application.applied_at) : "Sent",
      className: "bg-teal-50 text-[#0f8f83]",
      icon: CalendarCheck,
    };
  }

  if (application.status === "Ready") {
    return {
      label: "Ready to send",
      detail: "Download and apply",
      className: "bg-teal-50 text-[#0f8f83]",
      icon: Clock3,
    };
  }

  return {
    label: "Not applied yet",
    detail: "Ready when you are",
    className: "bg-amber-50 text-amber-700",
    icon: Clock3,
  };
}

export function ApplicationRow({ application, matchLabel = "Worth reviewing", ctaLabel = "Tailor & Apply" }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const job = application.jobs;
  const score = application.match_score;
  const status = statusTone(application);
  const StatusIcon = status.icon;

  async function deleteApplication() {
    const confirmed = window.confirm(`Delete ${job?.title ?? "this application"}?`);
    if (!confirmed) return;

    setDeleting(true);
    const response = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      window.alert(payload?.error ?? "Unable to delete application.");
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <article className="group max-w-full overflow-hidden rounded-[1.6rem] bg-white/82 p-4 shadow-[0_16px_54px_rgba(20,33,61,0.055)] transition duration-300 hover:bg-white md:p-5 md:hover:-translate-y-1 md:hover:shadow-[0_24px_70px_rgba(20,33,61,0.08)]">
      <div className="md:hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-amber-50 text-base font-semibold text-[#0f8f83]">
            {companyInitial(job?.company)}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/applications/${application.id}`} className="block">
              <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-[#14213d]">
                {job?.title ?? "Untitled role"}
              </h3>
            </Link>
            <p className="mt-1 truncate text-base text-slate-600">{job?.company ?? "Company"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ${status.className}`}>
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </span>
          <span className={`inline-flex rounded-full px-3.5 py-2 text-sm font-semibold ${scoreClass(score)}`}>
            {score === null ? "Match pending" : matchLabel}
          </span>
        </div>

        {expanded ? (
          <div className="mt-4 rounded-2xl bg-[#fffaf4] p-4 text-sm leading-6 text-slate-600">
            {job?.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {job.location}
              </p>
            ) : null}
            <p className="mt-2 flex items-center gap-2">
              <StatusIcon className="h-4 w-4 text-slate-400" />
              {status.detail}
            </p>
            {score !== null ? <p className="mt-2">{score}% match score</p> : null}
            <div className="mt-4 flex gap-2">
              <Link href={`/applications/${application.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-[#0f8f83]">
                View details
              </Link>
              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 transition hover:text-rose-500 disabled:opacity-50"
                disabled={deleting}
                onClick={deleteApplication}
                title="Delete application"
                type="button"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/applications/${application.id}`}
            className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)]"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
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
            {companyInitial(job?.company)}
          </div>

          <div className="min-w-0">
            <Link href={`/applications/${application.id}`} className="block">
              <h3 className="truncate text-lg font-semibold text-[#14213d] transition group-hover:text-[#0f8f83]">
                {job?.title ?? "Untitled role"}
              </h3>
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-slate-600">
              <span>{job?.company ?? "Company"}</span>
              {job?.location ? (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {job.location}
                  </span>
                </>
              ) : null}
              <span className="text-slate-300">•</span>
              <span>Hybrid</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className={`flex min-w-44 items-center gap-3 rounded-2xl px-4 py-3 ${status.className}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80">
              <StatusIcon className="h-4.5 w-4.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{status.label}</span>
              <span className="block text-xs opacity-75">{status.detail}</span>
            </span>
          </div>

          <div className="min-w-32">
            <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold tabular-nums ${scoreClass(score)}`}>
              {score === null ? "Match pending" : `${score}% Match`}
            </span>
            <p className="mt-1 text-sm text-slate-600">{matchLabel}</p>
          </div>

          <Link
            href={`/applications/${application.id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0b8f83]"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={`/applications/${application.id}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#14213d] shadow-[0_10px_30px_rgba(20,33,61,0.08)] transition hover:-translate-y-0.5 hover:text-[#0f8f83]"
            title="View application"
          >
            <Bookmark className="h-4.5 w-4.5" />
          </Link>

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-[0_10px_30px_rgba(20,33,61,0.06)] transition hover:-translate-y-0.5 hover:text-rose-500 disabled:opacity-50"
            disabled={deleting}
            onClick={deleteApplication}
            title="Delete application"
            type="button"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
