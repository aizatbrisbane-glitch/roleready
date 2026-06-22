"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, Trash2 } from "lucide-react";
import type { ApplicationWithJob } from "@/types/database";

type Props = {
  application: ApplicationWithJob;
  onRemoved: (id: string) => void;
};

export function SavedJobCard({ application, onRemoved }: Props) {
  const [removing, setRemoving] = useState(false);
  const job = application.jobs;

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
      if (res.ok) onRemoved(application.id);
    } finally {
      setRemoving(false);
    }
  }

  async function handlePrepare() {
    const res = await fetch(`/api/applications/${application.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "New" }),
    });
    if (res.ok) {
      window.location.href = `/applications/${application.id}`;
    }
  }

  if (!job) return null;

  return (
    <article className="group rounded-[1.6rem] border border-slate-100 bg-white p-4 shadow-sm transition duration-200 hover:shadow-[0_8px_30px_rgba(34,0,255,0.08)] sm:flex sm:items-center sm:gap-4 md:p-5">
      <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
        {/* Avatar */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4ccff] to-violet-50 text-base font-bold text-[#2200ff] md:h-12 md:w-12">
          {(job.company?.trim()?.[0] ?? "A").toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="line-clamp-1 font-semibold leading-snug text-slate-900">{job.title}</span>
            {job.job_url && (
              <a href={/^https?:\/\//i.test(job.job_url) ? job.job_url : `https://${job.job_url}`} target="_blank" rel="noopener noreferrer" title="View original job">
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 transition hover:text-[#2200ff]" />
              </a>
            )}
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
            {job.source && job.source !== "Manual" && (
              <>
                <span className="text-slate-300">•</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">{job.source}</span>
              </>
            )}
          </p>
          {job.salary && <p className="mt-0.5 text-sm font-medium text-slate-700">{job.salary}</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 sm:mt-0 sm:shrink-0">
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          title="Remove from saved"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:text-rose-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handlePrepare}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#2200ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
        >
          Prepare application <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
