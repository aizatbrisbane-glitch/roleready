import { AuthPanel } from "@/components/AuthPanel";
import { EnterpriseAdminPanel, type EnterpriseAdminRow } from "@/components/EnterpriseAdminPanel";
import { LandingPage } from "@/components/landing/LandingPage";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EnterprisePage() {
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

  const { data, error } = await supabase.rpc("get_enterprise_admin_dashboard");
  const rows = (data ?? []) as EnterpriseAdminRow[];

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
        <div className="mx-auto max-w-[960px] rounded-[1.6rem] border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-rose-600">Enterprise admin is not ready yet.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error.message}</p>
        </div>
      </main>
    );
  }

  if (rows.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
        <div className="mx-auto max-w-[760px] rounded-[1.6rem] border border-slate-100 bg-white p-6 shadow-sm">
          <p className="inline-flex rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff]">
            Enterprise
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            No admin access yet.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This dashboard is available to organisation owners and admins. Employee access still works from the main Koalapply dashboard.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1320px] overflow-x-clip">
        <EnterpriseAdminPanel rows={rows} currentUserId={user.id} />
      </div>
    </main>
  );
}
