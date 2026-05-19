"use client";

import { useState } from "react";
import { Briefcase, Plus, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { ApplicationRow } from "@/components/ApplicationRow";
import { GrabPanel } from "@/components/GrabPanel";
import { QuickApplyForm } from "@/components/QuickApplyForm";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Tab = "apply" | "grab" | "apps";

const STATUSES: ApplicationStatus[] = ["New", "Reviewed", "Ready", "Applied", "Interview", "Rejected"];

const STATUS_META: Record<ApplicationStatus, { color: string; dot: string }> = {
  New:       { color: "border-sky-400",    dot: "bg-sky-400" },
  Reviewed:  { color: "border-violet-400", dot: "bg-violet-400" },
  Ready:     { color: "border-teal-500",   dot: "bg-teal-500" },
  Applied:   { color: "border-amber-400",  dot: "bg-amber-400" },
  Interview: { color: "border-orange-400", dot: "bg-orange-400" },
  Rejected:  { color: "border-rose-400",   dot: "bg-rose-400" },
};

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "apps",  label: "Applications", icon: Briefcase },
  { id: "apply", label: "Apply",        icon: Sparkles },
  { id: "grab",  label: "Grab",         icon: Zap },
];

type Props = {
  applications: ApplicationWithJob[];
  resumeFileName: string | null;
  coverLetterFileName: string | null;
};

export function DashboardTabs({ applications, resumeFileName, coverLetterFileName }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("apps");

  return (
    <>
      {/* ── Desktop page header (hidden on mobile) ───────────── */}
      <div className="mb-6 hidden items-end justify-between gap-3 md:flex">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Paste a job link or grab matching ads, then generate tailored documents.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
        >
          <Plus className="h-4 w-4" />
          Manual Job
        </Link>
      </div>

      {/* ── Mobile sub-nav — segmented control ───────────────── */}
      <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1 md:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === id
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Sections ──────────────────────────────────────────── */}
      {/* On mobile: only active tab is visible.
          On desktop: all sections visible, stacked. */}

      {/* Applications — pipeline counts + full list */}
      <div className={activeTab === "apps" ? "block" : "hidden md:block"}>
        <div className="space-y-4 md:mt-8">
          {/* Status pipeline — 3×2 on mobile, 6×1 on desktop */}
          <section className="grid grid-cols-3 gap-2 lg:grid-cols-6">
            {STATUSES.map((status) => {
              const count = applications.filter((a) => a.status === status).length;
              const { color, dot } = STATUS_META[status];
              return (
                <div key={status} className={`rounded-xl border-l-4 bg-white px-2.5 py-2.5 shadow-sm lg:px-4 lg:py-4 ${color}`}>
                  <div className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-stone-500 lg:text-xs lg:tracking-widest">{status}</p>
                  </div>
                  <p className="mt-1 text-xl font-bold text-stone-900 lg:mt-2 lg:text-3xl">{count}</p>
                </div>
              );
            })}
          </section>

          {/* Application list */}
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="hidden border-b border-stone-100 bg-stone-50/60 px-5 py-3 md:block">
              <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-widest text-stone-400">
                <span className="col-span-3">Role</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-1">Match</span>
                <span className="col-span-2">Documents</span>
                <span className="col-span-1">Created</span>
                <span className="col-span-1">Applied</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                <Briefcase className="h-10 w-10 text-stone-300" />
                <p className="text-sm font-medium text-stone-500">No applications yet.</p>
                <p className="text-sm text-stone-400">
                  Paste a job link in Apply or grab matching ads to get started.
                </p>
              </div>
            ) : (
              applications.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))
            )}
          </section>
        </div>
      </div>

      {/* Apply — Quick Apply form only */}
      <div className={activeTab === "apply" ? "block" : "hidden md:block"}>
        <div className="md:mt-6">
          <QuickApplyForm resumeFileName={resumeFileName} coverLetterFileName={coverLetterFileName} />
        </div>
      </div>

      {/* Grab — job search + AI matching */}
      <div className={activeTab === "grab" ? "block" : "hidden md:block"}>
        <div className="md:mt-4">
          <GrabPanel hasResume={Boolean(resumeFileName)} />
        </div>
      </div>

    </>
  );
}
