import { AuthPanel } from "@/components/AuthPanel";
import { ProfileForm } from "@/components/ProfileForm";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MasterCoverLetter, MasterResume, Profile } from "@/types/database";

export default async function ProfilePage() {
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

  const [{ data: profile }, { data: masterResume }, { data: masterCoverLetter }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("master_resumes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("master_cover_letters").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ProfileForm profile={profile as Profile | null} masterResume={masterResume as MasterResume | null} masterCoverLetter={masterCoverLetter as MasterCoverLetter | null} />
    </main>
  );
}
