"use client";

import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Props = {
  application: ApplicationWithJob;
};

const statusClass: Record<ApplicationStatus, string> = {
  New:       "badge badge-new",
  Reviewed:  "badge badge-reviewed",
  Ready:     "badge badge-ready",
  Applied:   "badge badge-applied",
  Interview: "badge badge-interview",
  Rejected:  "badge badge-rejected",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-teal-700 font-bold";
  if (score >= 60) return "text-amber-600 font-bold";
  return "text-rose-600 font-bold";
}

function providerLabel(provider: string | null) {
  if (provider === "anthropic") return "Anthropic";
  if (provider === "openai") return "OpenAI";
  return null;
}

export function ApplicationRow({ application }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const generated = Boolean(application.tailored_resume && application.cover_letter);
  const provider = providerLabel(application.generated_by);
  const status = (application.status ?? "New") as ApplicationStatus;
  const job = application.jobs;

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
    <div className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/50">

      {/* ── Mobile card (< md) ─────────────────────────────────── */}
      <div className="md:hidden px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusClass[status]}>{status}</span>
            {application.match_score !== null && (
              <span className={`text-sm tabular-nums ${scoreColor(application.match_score)}`}>
                {application.match_score}%
              </span>
            )}
          </div>
          <Link
            href={`/applications/${application.id}`}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Link href={`/applications/${application.id}`} className="mt-2 block">
          <p className="font-semibold leading-snug text-stone-900">
            {job?.title ?? "Untitled role"}
          </p>
          <p className="mt-0.5 text-sm text-stone-500">
            {job?.company}
            {job?.location ? ` · ${job.location}` : ""}
          </p>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {generated ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                {provider ? `${provider}` : "Docs ready"}
              </span>
            ) : (
              <span className="text-xs text-stone-400">No docs yet</span>
            )}
            <span className="text-xs text-stone-400">{formatDate(application.created_at)}</span>
          </div>
          <button
            className="text-xs text-stone-400 transition hover:text-red-600 disabled:opacity-50"
            disabled={deleting}
            onClick={deleteApplication}
            type="button"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* ── Desktop table row (≥ md) ───────────────────────────── */}
      <div className="hidden md:grid grid-cols-12 items-center px-5 py-3.5 text-sm">
        {/* Role */}
        <Link href={`/applications/${application.id}`} className="col-span-3 min-w-0 pr-3">
          <span className="block truncate font-semibold text-stone-900">
            {job?.title ?? "Untitled role"}
          </span>
          <span className="block truncate text-xs text-stone-500">{job?.company}</span>
        </Link>

        {/* Status */}
        <span className="col-span-2">
          <span className={statusClass[status]}>{status}</span>
        </span>

        {/* Match score */}
        <span className="col-span-1 tabular-nums">
          {application.match_score === null ? (
            <span className="text-stone-400">—</span>
          ) : (
            <span className={scoreColor(application.match_score)}>{application.match_score}%</span>
          )}
        </span>

        {/* Documents */}
        <span className="col-span-2">
          {generated ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Ready{provider ? ` · ${provider}` : ""}
            </span>
          ) : (
            <span className="text-xs text-stone-400">Not generated</span>
          )}
        </span>

        {/* Created */}
        <span className="col-span-1 text-xs text-stone-400">{formatDate(application.created_at)}</span>

        {/* Applied */}
        <span className="col-span-1 text-xs text-stone-400">
          {application.applied_at ? formatDate(application.applied_at) : <span className="text-stone-300">—</span>}
        </span>

        {/* Actions */}
        <span className="col-span-2 flex justify-end gap-1.5">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 transition hover:border-red-200 hover:text-red-600"
            disabled={deleting}
            onClick={deleteApplication}
            title="Delete application"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <Link
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            href={`/applications/${application.id}`}
            title="Open application"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </span>
      </div>

    </div>
  );
}
