import { DashboardTabs } from "@/components/DashboardTabs";
import { LandingPage } from "@/components/landing/LandingPage";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationWithJob } from "@/types/database";

export default async function DashboardPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  let applications: ApplicationWithJob[] = [];
  let resumeFileName: string | null = null;
  let coverLetterFileName: string | null = null;

  if (supabase && user) {
    const [{ data }, { data: resume }, { data: coverLetter }] = await Promise.all([
      supabase.from("applications").select("*, jobs(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("master_resumes").select("id, file_name").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("master_cover_letters").select("id, file_name").eq("user_id", user.id).limit(1).maybeSingle()
    ]);
    applications = (data ?? []) as ApplicationWithJob[];
    resumeFileName = resume?.file_name ?? null;
    coverLetterFileName = coverLetter?.file_name ?? null;
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
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <DashboardTabs
        applications={applications}
        resumeFileName={resumeFileName}
        coverLetterFileName={coverLetterFileName}
      />
    </main>
  );
}
