import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, CircleDot, Globe, TrendingUp } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { ApplicationActions } from "@/components/ApplicationActions";
import { JobDescriptionEditor } from "@/components/JobDescriptionEditor";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusSelector } from "@/components/StatusSelector";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

const statusClass: Record<ApplicationStatus, string> = {
  New:       "badge badge-new",
  Reviewed:  "badge badge-reviewed",
  Ready:     "badge badge-ready",
  Applied:   "badge badge-applied",
  Interview: "badge badge-interview",
  Rejected:  "badge badge-rejected",
};

function scoreColor(score: number) {
  if (score >= 80) return "text-teal-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function Preview({ title, content }: { title: string; content: string | null }) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-3">
        <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
      </div>
      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-sans text-sm leading-6 text-stone-800">
        {content ?? (
          <span className="text-stone-400 italic">Generate the application to see this document.</span>
        )}
      </pre>
    </section>
  );
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!configured) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  if (!user || !supabase) {
    return (
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-12">
        <AuthPanel />
      </main>
    );
  }

  const { data } = await supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
  const application = data as ApplicationWithJob | null;

  if (!application || !application.jobs) {
    notFound();
  }

  const job = application.jobs;
  const hasDocuments = Boolean(application.tailored_resume && application.cover_letter);
  const jobDescriptionLooksShort = job.description.trim().length < 800;
  const status = (application.status ?? "New") as ApplicationStatus;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">

      {/* Breadcrumb + title row */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-teal-700">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{job.title}</h1>
            <p className="mt-1 text-sm text-stone-500">
              {job.company}{job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <ApplicationActions applicationId={application.id} hasDocuments={hasDocuments} />
        </div>
      </div>

      {/* Metadata cards */}
      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
          <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <div>
            <p className="label">Status</p>
            <p className="mt-1.5 text-sm font-semibold text-stone-800">{status}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <div>
            <p className="label">Match score</p>
            {application.match_score === null ? (
              <p className="mt-1.5 text-lg font-bold text-stone-400">Pending</p>
            ) : (
              <p className={`mt-1.5 text-2xl font-bold ${scoreColor(application.match_score)}`}>
                {application.match_score}%
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <div>
            <p className="label">Salary</p>
            <p className="mt-1.5 text-sm font-semibold text-stone-800">{job.salary || "Not listed"}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <div>
            <p className="label">Source</p>
            <p className="mt-1.5 text-sm font-semibold text-stone-800">{job.source}</p>
          </div>
        </div>
      </section>

      {/* Status selector */}
      <section className="mt-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
        <p className="label mb-3">Update status</p>
        <StatusSelector applicationId={application.id} currentStatus={status} />
      </section>

      {/* Call-to-action banner */}
      <section className={`mt-5 rounded-xl border p-5 ${hasDocuments ? "border-teal-200 bg-teal-50" : "border-stone-200 bg-white shadow-sm"}`}>
        <h2 className="font-semibold text-stone-900">
          {hasDocuments ? "Documents are ready to download" : "Next step: generate your tailored documents"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
          {hasDocuments
            ? "Review the resume and cover letter previews below. Download DOCX or PDF when you're happy, or regenerate with a different AI provider."
            : "Select an AI provider above, then click Generate Tailored Documents. The AI will compare this job ad against your master resume and cover letter."}
        </p>
        {jobDescriptionLooksShort && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
            This job description looks very short — the job site may have blocked the full text. Paste the complete ad below, save it, then generate.
          </div>
        )}
      </section>

      {/* Main content grid */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Left column */}
        <div className="space-y-5">
          {jobDescriptionLooksShort && (
            <JobDescriptionEditor applicationId={application.id} initialDescription={job.description} />
          )}

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-3">
              <h2 className="text-sm font-semibold text-stone-700">Job Description</h2>
            </div>
            <p className="max-h-[400px] overflow-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-stone-700">
              {job.description}
            </p>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Match Analysis</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
              {application.match_explanation ?? "Prepare the application to see how your resume maps to this role."}
            </p>

            {application.missing_keywords.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-stone-700">Missing Keywords</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {application.missing_keywords.map((kw) => (
                    <span key={kw} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                      {kw}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right column — document previews */}
        <div className="space-y-5">
          <Preview title="Tailored Resume" content={application.tailored_resume} />
          <Preview title="Cover Letter" content={application.cover_letter} />
        </div>
      </section>
    </main>
  );
}
