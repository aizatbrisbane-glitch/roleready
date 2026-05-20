import { DashboardTabs } from "@/components/DashboardTabs";
import { LandingPage } from "@/components/landing/LandingPage";
import { SetupNotice } from "@/components/SetupNotice";
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
  let grabbedMatches: CachedGrabbedJob[] = [];

  if (supabase && user) {
    const [{ data }, { data: resume }, { data: coverLetter }, { data: profile }, { data: cachedMatches }] = await Promise.all([
      supabase.from("applications").select("*, jobs(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("master_resumes").select("id, file_name").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("master_cover_letters").select("id, file_name").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      supabase.from("cached_grabbed_jobs").select("*").eq("user_id", user.id).order("match_score", { ascending: false }).limit(15)
    ]);
    applications = (data ?? []) as ApplicationWithJob[];
    resumeFileName = resume?.file_name ?? null;
    coverLetterFileName = coverLetter?.file_name ?? null;
    profileName = profile?.name ?? user.user_metadata?.name ?? user.email ?? null;
    grabbedMatches = (cachedMatches ?? []) as CachedGrabbedJob[];
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

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <DashboardTabs
        applications={applications}
        resumeFileName={resumeFileName}
        coverLetterFileName={coverLetterFileName}
        userName={profileName}
        grabbedMatches={grabbedMatches}
        grabbedMatchesStale={isStaleGrabCache(grabbedMatches)}
      />
    </main>
  );
}
