import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { ApplicationDetailClient } from "@/components/ApplicationDetailClient";
import { GenerateButton } from "@/components/GenerateButton";
import { JobDescriptionEditor } from "@/components/JobDescriptionEditor";
import { PostGenerationGuide } from "@/components/PostGenerationGuide";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusSelector } from "@/components/StatusSelector";
import { getAccessState } from "@/lib/entitlements";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generate?: string }>;
};

function scoreTone(score: number | null) {
  if (score === null) return { label: "Match pending", className: "text-slate-500", pill: "bg-slate-100 text-slate-600" };
  if (score >= 85) return { label: "Strong match", className: "text-[#2200ff]", pill: "bg-[#d4ccff] text-[#1a00cc]" };
  if (score >= 70) return { label: "Good match", className: "text-amber-600", pill: "bg-amber-100 text-amber-700" };
  if (score >= 50) return { label: "Worth reviewing", className: "text-violet-600", pill: "bg-violet-100 text-violet-700" };
  return { label: "Needs tailoring", className: "text-rose-600", pill: "bg-rose-50 text-rose-600" };
}

function statusGuidance(status: ApplicationStatus, hasDocuments: boolean) {
  if (!hasDocuments) {
    return {
      headline: "Generate documents first.",
      body: "Create your tailored resume and cover letter, then track the application here.",
      next: "Generate documents",
    };
  }

  if (status === "Ready") {
    return {
      headline: "Ready to send.",
      body: "Download, submit, then mark as Applied.",
      next: "Mark Applied after sending",
    };
  }

  if (status === "Applied") {
    return {
      headline: "Application sent.",
      body: "Keep it here while you wait for a response.",
      next: "Move to Interview if they reply",
    };
  }

  if (status === "Interview") {
    return {
      headline: "Interview stage.",
      body: "Review the role and prepare your talking points.",
      next: "Prepare for interview",
    };
  }

  if (status === "Rejected") {
    return {
      headline: "Closed outcome.",
      body: "Keep it as a reference for future applications.",
      next: "Review and learn",
    };
  }

  return {
    headline: "Keep it moving.",
    body: "Update the status as the application progresses.",
    next: hasDocuments ? "Review documents" : "Generate documents",
  };
}

function jobDisplayCopy(job: NonNullable<ApplicationWithJob["jobs"]>) {
  const title = String(job.title ?? "").trim();
  const company = String(job.company ?? "").trim();
  const description = String(job.description ?? "").trim();
  const combined = `${title}\n${description}`.toLowerCase();
  const looksBlocked =
    description.length < 80 ||
    [
      "just a moment",
      "403 forbidden",
      "access denied",
      "request blocked",
      "captcha",
      "verify you are human",
      "job description unavailable"
    ].some((phrase) => combined.includes(phrase));

  if (!looksBlocked) {
    return {
      title: title || "Untitled role",
      company: company || "Company from job ad",
      note: null as string | null
    };
  }

  return {
    title: "Oops, we need the job description",
    company: "This job board blocked the full ad",
    note: "Paste the full job description below so we can tailor your application properly."
  };
}

export default async function ApplicationDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { generate } = await searchParams;
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
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

  const [{ data }, { data: masterResume }, access] = await Promise.all([
    supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("master_resumes").select("id").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    getAccessState(supabase, user.id),
  ]);
  const application = data as ApplicationWithJob | null;

  if (!application || !application.jobs) {
    notFound();
  }

  const job = application.jobs;
  const hasDocuments = Boolean(application.tailored_resume && application.cover_letter);
  const autoGenerate =
    generate === "true" &&
    !hasDocuments &&
    !!masterResume &&
    job.description.trim().length > 0 &&
    access.canGenerate;
  const showWelcomeGuide = generate === "true" && hasDocuments;

  const generateHint =
    generate === "true" && !hasDocuments && !autoGenerate
      ? !masterResume
        ? "Set up your master resume at Documents before generating."
        : job.description.trim().length === 0
        ? "Paste the full job description below, then click Generate."
        : null
      : null;
  const missingKeywords = application.missing_keywords ?? [];
  const jobDescriptionLooksShort = job.description.trim().length < 800;
  const status = (application.status ?? "New") as ApplicationStatus;
  const score = scoreTone(application.match_score);
  const guidance = statusGuidance(status, hasDocuments);
  const displayJob = jobDisplayCopy(job);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1520px] overflow-x-clip">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2200ff] transition hover:text-[#1a00cc]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to applications
          </Link>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            {/* Title + meta */}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                {displayJob.title}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>{displayJob.company}</span>
                {job.location ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {job.location}
                    </span>
                  </>
                ) : null}
                <span className="text-slate-300">•</span>
                <span>{job.source}</span>
                {job.job_url ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#2200ff]">
                      View job ad <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                ) : null}
              </p>
              {displayJob.note ? (
                <p className="mt-2 max-w-xl text-sm font-medium text-[#2200ff]">{displayJob.note}</p>
              ) : null}
            </div>

            {/* Status — slotted next to title */}
            <div className="w-full shrink-0 lg:w-52">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Application Status</p>
              <StatusSelector applicationId={application.id} currentStatus={status} />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">

            {/* Hero */}
            <section className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-gradient-to-br from-[#ece8ff]/60 via-white to-[#d4ccff]/40 p-5 shadow-sm md:p-8">
              {/* Row 1: score + headline — stacks on mobile */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#2200ff] shadow-sm">
                    {hasDocuments ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold tabular-nums ${score.className}`}>
                      {application.match_score === null ? "—" : `${application.match_score}%`}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${score.pill}`}>{score.label}</span>
                  </div>
                </div>
                <h2 className="text-base font-bold text-slate-900 sm:shrink-0 sm:text-lg">
                  {hasDocuments ? "You're ready to apply!" : "Generate your tailored application"}
                </h2>
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-slate-100" />

              {/* Row 2: guidance + actions */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-600">{guidance.body}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Next: {guidance.next}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                  {hasDocuments && (
                    <>
                      <a
                        href={`/api/applications/${application.id}/export?type=resume&format=docx`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:w-auto"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download resume
                      </a>
                      <a
                        href={`/api/applications/${application.id}/export?type=cover&format=docx`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 sm:w-auto"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download cover letter
                      </a>
                    </>
                  )}
                  <GenerateButton applicationId={application.id} hasDocuments={hasDocuments} canGenerate={access.canGenerate} autoGenerate={autoGenerate} generateHint={generateHint} />
                </div>
              </div>
            </section>

            {jobDescriptionLooksShort && <JobDescriptionEditor applicationId={application.id} initialDescription={job.description} />}

            <PostGenerationGuide applicationId={application.id} show={showWelcomeGuide} />

            {/* Opportunities to strengthen + Tabs */}
            <ApplicationDetailClient
              applicationId={application.id}
              missingKeywords={application.missing_keywords ?? []}
              matchScore={application.match_score}
              tailoredResume={application.tailored_resume}
              coverLetter={application.cover_letter}
              jobDescription={job.description}
              initialSalary={job.salary}
              matchExplanation={application.match_explanation}
              initialRoleSummary={application.role_summary}
              initialHiringManager={application.hiring_manager}
              initialLocationType={application.location_type}
              initialOtherNotes={application.other_notes}
              initialNotes={application.notes}
              planType={access.planType}
              hasTailoredResume={!!application.tailored_resume}
              hasCoverLetter={!!application.cover_letter}
              strengthenedKeywords={application.strengthened_keywords ?? []}
              strengthenedKeywordSnippets={application.strengthened_keyword_snippets ?? {}}
            />

        </div>
      </div>
    </main>
  );
}
