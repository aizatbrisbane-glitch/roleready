import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { DashboardTabs } from "@/components/DashboardTabs";
import { LandingPage } from "@/components/landing/LandingPage";
import { DeferredOnboardingResume } from "@/components/landing/HomepageOnboardingModal";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { SetupNotice } from "@/components/SetupNotice";
import { getAccessState, type AccessState } from "@/lib/entitlements";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationWithJob, CachedGrabbedJob } from "@/types/database";

function isStaleGrabCache(matches: CachedGrabbedJob[]) {
  if (matches.length === 0) return true;
  const fetchedAt = matches[0]?.fetched_at;
  if (!fetchedAt) return true;
  const fetched = new Date(fetchedAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return fetched < today;
}

export default async function DashboardPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  let applications: ApplicationWithJob[] = [];
  let resumeFileName: string | null = null;
  let coverLetterFileName: string | null = null;
  let profileName: string | null = null;
  let profileLocation: string | null = null;
  let grabbedMatches: CachedGrabbedJob[] = [];
  let savedByUrl: Record<string, string> = {};
  let accessState: AccessState | null = null;

  if (supabase && user) {
    const [{ data }, { data: resume }, { data: coverLetter }, { data: profile }, { data: cachedMatches }, { data: savedApps }, access, { data: enterpriseMembership }] = await Promise.all([
      supabase.from("applications").select("*, jobs(*)").eq("user_id", user.id).neq("status", "Saved").order("created_at", { ascending: false }),
      supabase.from("master_resumes").select("id, file_name").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("master_cover_letters").select("id, file_name").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("profiles").select("name, location").eq("id", user.id).maybeSingle(),
      supabase.from("cached_grabbed_jobs").select("*").eq("user_id", user.id).order("match_score", { ascending: false }).limit(15),
      supabase.from("applications").select("id, jobs(job_url)").eq("user_id", user.id).eq("status", "Saved"),
      getAccessState(supabase, user.id),
      supabase.from("organization_members").select("id").eq("user_id", user.id).in("role", ["owner", "admin"]).limit(1).maybeSingle(),
    ]);
    applications = (data ?? []) as ApplicationWithJob[];
    resumeFileName = resume?.file_name ?? null;
    coverLetterFileName = coverLetter?.file_name ?? null;
    profileName = profile?.name ?? user.user_metadata?.name ?? user.email ?? null;
    profileLocation = (profile as { location?: string } | null)?.location ?? null;
    grabbedMatches = (cachedMatches ?? []) as CachedGrabbedJob[];
    savedByUrl = Object.fromEntries(
      (savedApps ?? [])
        .map((a) => [(a.jobs as { job_url?: string } | null)?.job_url, a.id])
        .filter((e): e is [string, string] => Boolean(e[0]))
    );
    accessState = access;

    if (enterpriseMembership) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
          <div className="mx-auto max-w-[760px] rounded-[1.6rem] border border-[#ece8ff] bg-white p-6 shadow-sm md:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff]">
              <Building2 className="h-4 w-4" />
              Enterprise Admin
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Your account manages your team&apos;s access.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              As an organisation owner or admin, your Koalapply account is for HR management — not job searching. Head to the enterprise dashboard to manage seats and employee access.
            </p>
            <Link
              href="/enterprise"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
            >
              Go to Enterprise Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      );
    }
  }

  if (!configured) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (!resumeFileName) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-36 md:px-8 md:pb-10 xl:px-10">
        <DeferredOnboardingResume />
        <OnboardingWizard />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <DeferredOnboardingResume />
      <DashboardTabs
        applications={applications}
        resumeFileName={resumeFileName}
        coverLetterFileName={coverLetterFileName}
        userName={profileName}
        profileLocation={profileLocation}
        grabbedMatches={grabbedMatches}
        grabbedMatchesStale={isStaleGrabCache(grabbedMatches)}
        savedByUrl={savedByUrl}
        accessState={accessState}
      />
    </main>
  );
}
