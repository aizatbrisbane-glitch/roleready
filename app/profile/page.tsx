import { Settings } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function ProfilePage() {
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

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1520px] overflow-x-clip">
        <div className="mb-6 max-w-4xl md:mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff] md:text-xs">
            <Settings className="h-4 w-4" />
            Profile settings
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Tell Koalapply what you&apos;re aiming for.
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 md:mt-3 md:text-lg md:leading-8">
            Your details and preferences help shape better matches and stronger applications.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ProfileSettingsForm profile={profile as Profile | null} userEmail={user.email} />

          <aside className="rounded-[1.8rem] border border-slate-100 bg-gradient-to-br from-[#ece8ff]/80 via-white to-[#d4ccff]/50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2200ff]">Profile signal</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              Better details, better matches.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Keep your target roles, locations, and industries current so Koalapply can find fresher opportunities and tailor with more context.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
