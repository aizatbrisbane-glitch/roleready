import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchAdminMetrics } from "@/lib/admin-metrics";
import { LiveDashboard } from "@/components/admin/LiveDashboard";

export const metadata: Metadata = {
  title: "Mission Control — Koalapply",
  robots: "noindex, nofollow",
};

export default async function AdminLivePage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "founder"].includes(profile.role)) {
    redirect("/");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/");

  const [metrics, { data: rawEvents }, rpcResult] = await Promise.all([
    fetchAdminMetrics(admin),
    admin
      .from("koalapply_events")
      .select("id, event_type, user_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin.rpc("admin_get_user_emails"),
  ]);

  const emailRows = (rpcResult.data ?? []) as { id: string; email: string }[];
  const emailByUserId: Record<string, string> = Object.fromEntries(
    emailRows.map((r) => [r.id, r.email])
  );

  const initialEvents = (rawEvents ?? []).map((ev) => ({
    ...ev,
    email: ev.user_id ? (emailByUserId[ev.user_id] ?? null) : null,
  }));

  return (
    <LiveDashboard
      initialMetrics={metrics}
      initialEvents={initialEvents}
      emailByUserId={emailByUserId}
    />
  );
}
