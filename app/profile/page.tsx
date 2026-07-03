import Link from "next/link";
import { ArrowRight, Settings, Zap } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { PasswordSection } from "@/components/PasswordSection";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { getAccessState } from "@/lib/entitlements";
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

  const [{ data: profile }, access] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getAccessState(supabase, user.id),
  ]);

  const isOAuthOnly = Array.isArray(user.identities) &&
    user.identities.length > 0 &&
    user.identities.every((id) => id.provider !== "email");

  const validUntilFormatted = access.validUntil
    ? new Date(access.validUntil).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const usagePct = access.applicationLimit > 0
    ? Math.round((access.applicationsUsed / access.applicationLimit) * 100)
    : 0;

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

          <div className="flex flex-col gap-5">
            {/* Plan card */}
            <aside className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Your plan</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  access.planType === "free"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-[#ece8ff] text-[#2200ff]"
                }`}>
                  <Zap className="h-3 w-3" />
                  {access.planLabel}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-end justify-between gap-2 text-sm">
                  <span className="text-slate-600">Applications used</span>
                  <span className="font-bold text-slate-900">{access.applicationsUsed} / {access.applicationLimit}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${access.applicationsRemaining === 0 ? "bg-rose-400" : "bg-[#2200ff]"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {access.applicationsRemaining} application{access.applicationsRemaining !== 1 ? "s" : ""} remaining
                </p>
              </div>

              {validUntilFormatted && (
                <p className="mt-4 text-xs text-slate-400">
                  Active until <span className="font-semibold text-slate-600">{validUntilFormatted}</span>
                </p>
              )}

              {access.planType === "free" ? (
                <Link
                  href="/pricing"
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2200ff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
                >
                  Upgrade plan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="mt-4 text-xs text-slate-400">One-off pass — no subscription, no auto-renewal.</p>
              )}
            </aside>

            {/* Profile tip */}
            <aside className="rounded-[1.8rem] border border-slate-100 bg-gradient-to-br from-[#ece8ff]/80 via-white to-[#d4ccff]/50 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2200ff]">Profile signal</p>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                Better details, better matches.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Keep your target roles, locations, and industries current so Koalapply can find fresher opportunities and tailor with more context.
              </p>
            </aside>

            <PasswordSection isOAuthOnly={isOAuthOnly} />
          </div>
        </div>
      </div>
    </main>
  );
}
