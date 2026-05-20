import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Lightbulb,
  MapPin,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { ApplicationActions } from "@/components/ApplicationActions";
import { JobDescriptionEditor } from "@/components/JobDescriptionEditor";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusSelector } from "@/components/StatusSelector";
import { formatDate } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ApplicationWithJob } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

function scoreTone(score: number | null) {
  if (score === null) return { label: "Match pending", className: "text-slate-500", pill: "bg-slate-100 text-slate-600" };
  if (score >= 85) return { label: "Strong match", className: "text-[#0f8f83]", pill: "bg-teal-100 text-[#0f8f83]" };
  if (score >= 70) return { label: "Good match", className: "text-amber-600", pill: "bg-amber-100 text-amber-700" };
  if (score >= 50) return { label: "Worth reviewing", className: "text-violet-600", pill: "bg-violet-100 text-violet-700" };
  return { label: "Needs tailoring", className: "text-rose-600", pill: "bg-rose-50 text-rose-600" };
}

function previewText(content: string | null, fallback: string) {
  if (!content?.trim()) return fallback;
  return content.replace(/[#*_`>-]/g, "").replace(/\s+/g, " ").trim().slice(0, 170);
}

function DocumentCard({
  title,
  eyebrow,
  content,
  href,
  icon: Icon,
}: {
  title: string;
  eyebrow: string;
  content: string | null;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const ready = Boolean(content);

  return (
    <section className="rounded-[1.6rem] bg-white/82 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
      <div className="flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ready ? "bg-teal-50 text-[#0f9f92]" : "bg-slate-100 text-slate-400"}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#14213d]">{title}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-teal-100 text-[#0f8f83]" : "bg-slate-100 text-slate-500"}`}>
              {ready ? "Ready" : "Pending"}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {ready ? "Ready to review and download." : "Generate this application to preview the tailored document."}
          </p>
          <a href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f8f83]">
            Preview {title.toLowerCase()} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function FullPreview({ id, title, content }: { id: string; title: string; content: string | null }) {
  return (
    <section id={id} className="overflow-hidden rounded-[1.6rem] bg-white/82 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
      <div className="border-b border-stone-100 bg-white/60 px-5 py-4">
        <h2 className="font-semibold text-[#14213d]">{title}</h2>
      </div>
      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words px-5 py-5 font-sans text-sm leading-7 text-slate-700">
        {content ?? <span className="italic text-slate-400">Generate the application to see this document.</span>}
      </pre>
    </section>
  );
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

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
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

  const { data } = await supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
  const application = data as ApplicationWithJob | null;

  if (!application || !application.jobs) {
    notFound();
  }

  const job = application.jobs;
  const hasDocuments = Boolean(application.tailored_resume && application.cover_letter);
  const jobDescriptionLooksShort = job.description.trim().length < 800;
  const status = (application.status ?? "New") as ApplicationStatus;
  const score = scoreTone(application.match_score);
  const readyCopy = hasDocuments
    ? "Review your tailored documents, download them, then mark the application as applied when it’s sent."
    : "Generate tailored documents first. ApplyHQ will compare the job ad against your master resume and cover letter.";
  const missingKeywords = application.missing_keywords ?? [];
  const guidance = statusGuidance(status, hasDocuments);
  const heroCopy = hasDocuments
    ? "Your tailored resume and cover letter are ready."
    : "Generate your tailored documents to get ready to apply.";

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1520px] overflow-x-clip">
        <div className="mb-5 md:mb-7">
          <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0f8f83] transition hover:text-[#0b7d73]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to applications
          </Link>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="max-w-5xl font-serif text-3xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
                {job.title}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>{job.company}</span>
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
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#0f8f83]">
                      View job ad <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-teal-50 via-white to-amber-50 p-5 shadow-[0_24px_80px_rgba(20,33,61,0.075)] md:p-8">
              <div className="grid gap-7 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                <div className="flex gap-4 md:gap-5">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#0f9f92] shadow-sm md:h-16 md:w-16">
                    {hasDocuments ? <CheckCircle2 className="h-7 w-7 md:h-8 md:w-8" /> : <Sparkles className="h-7 w-7 md:h-8 md:w-8" />}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-[#14213d] md:text-2xl">
                      {hasDocuments ? "You’re ready to apply!" : "Generate your tailored application"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 md:text-sm">{heroCopy}</p>
                  </div>
                </div>

                <div className="min-w-0 sm:min-w-36">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Match score</p>
                  <p className={`mt-1 text-4xl font-semibold ${score.className}`}>
                    {application.match_score === null ? "Pending" : `${application.match_score}%`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{score.label}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  {hasDocuments ? (
                    <>
                      <a
                        href={`/api/applications/${application.id}/export?type=resume&format=docx`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0b8f83] sm:px-5"
                      >
                        <Download className="h-4 w-4" />
                        Download resume
                      </a>
                      <a
                        href={`/api/applications/${application.id}/export?type=cover&format=docx`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#0f8f83] shadow-sm transition hover:-translate-y-0.5 sm:px-5"
                      >
                        <Download className="h-4 w-4" />
                        Download cover letter
                      </a>
                    </>
                  ) : (
                    <a href="#quick-actions" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0b8f83] sm:px-5">
                      Generate documents <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white/88 p-5 shadow-[0_18px_58px_rgba(20,33,61,0.055)] md:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(360px,1fr)] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f8f83]">Application status</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-[#14213d]">{status}</h2>
                    <span className="rounded-full bg-[#fffaf4] px-3 py-1 text-sm font-semibold text-slate-600">{guidance.next}</span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{guidance.body}</p>
                </div>

                <div className="rounded-[1.4rem] bg-teal-50/55 p-4">
                  <StatusSelector applicationId={application.id} currentStatus={status} />
                </div>
              </div>
            </section>

            {jobDescriptionLooksShort && <JobDescriptionEditor applicationId={application.id} initialDescription={job.description} />}

            <section className="grid gap-4 lg:grid-cols-3">
              <DocumentCard
                title="Tailored Resume"
                eyebrow={hasDocuments ? "Ready to review" : "Waiting to generate"}
                content={application.tailored_resume}
                href="#tailored-resume"
                icon={FileText}
              />
              <DocumentCard
                title="Cover Letter"
                eyebrow={hasDocuments ? `Personalised for ${job.company}` : "Waiting to generate"}
                content={application.cover_letter}
                href="#cover-letter"
                icon={Send}
              />
              <section className="rounded-[1.6rem] bg-white/82 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Target className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#14213d]">Match Analysis</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${score.pill}`}>{score.label}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {previewText(application.match_explanation, "Generate this application to see how your resume maps to this role.")}
                    </p>
                    <a href="#match-analysis" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f8f83]">
                      View full analysis <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </section>
            </section>

            <section className="rounded-[1.6rem] bg-white/82 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)] md:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#14213d]">Opportunities to strengthen</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {missingKeywords.length > 0 ? "These missing keywords may make your application stronger." : "No major keyword gaps were identified yet."}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {(missingKeywords.length > 0 ? missingKeywords.slice(0, 3) : ["Review job requirements", "Check resume emphasis", "Personalise your opening"]).map((item) => (
                  <div key={item} className="rounded-2xl bg-[#fffaf4] px-4 py-4">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <p className="mt-3 text-sm font-semibold text-[#14213d]">{item}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {missingKeywords.length > 0 ? "Mention this only if it genuinely appears in your experience." : "Use the generated documents as a starting point, then add context where it is true."}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <FullPreview id="tailored-resume" title="Tailored Resume" content={application.tailored_resume} />
              <FullPreview id="cover-letter" title="Cover Letter" content={application.cover_letter} />
            </section>

            <section id="match-analysis" className="rounded-[1.6rem] bg-white/82 px-5 py-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
              <h2 className="font-semibold text-[#14213d]">Full match analysis</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {application.match_explanation ?? "Generate the application to see how your resume maps to this role."}
              </p>
            </section>

            <section className="overflow-hidden rounded-[1.6rem] bg-white/82 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
              <div className="border-b border-stone-100 bg-white/60 px-5 py-4">
                <h2 className="font-semibold text-[#14213d]">Job Description</h2>
              </div>
              <p className="max-h-[430px] overflow-auto whitespace-pre-wrap px-5 py-5 text-sm leading-7 text-slate-700">
                {job.description}
              </p>
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section id="quick-actions" className="rounded-[1.6rem] bg-white/82 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
              <h2 className="font-semibold text-[#14213d]">Quick actions</h2>
              <div className="mt-4">
                <ApplicationActions applicationId={application.id} hasDocuments={hasDocuments} />
              </div>
            </section>

            <section className="rounded-[1.6rem] bg-teal-50/80 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.045)]">
              <div className="flex gap-3">
                <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#0f9f92]" />
                <div>
                  <h2 className="font-semibold text-[#14213d]">Role details</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-slate-400" />
                      {job.salary || "Salary not listed"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      {job.source}
                    </p>
                    {application.applied_at ? (
                      <p className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-slate-400" />
                        Applied {formatDate(application.applied_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
