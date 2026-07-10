import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminMetrics } from "@/types/database";

// Optional: set these env vars to enable MRR calculation.
// sprint_7_day is a one-time purchase so it is excluded from MRR.
const PLAN_PRICES_AUD: Record<string, number> = {
  focus_30_day:   parseFloat(process.env.PLAN_PRICE_FOCUS   ?? "0"),
  partner_90_day: parseFloat(process.env.PLAN_PRICE_PARTNER ?? "0") / 3, // quarterly → monthly
};

export async function fetchAdminMetrics(admin: SupabaseClient): Promise<AdminMetrics> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [
    { data: authUsers },
    { count: resumesUploaded },
    { count: jobsAnalysed },
    { count: resumesGenerated },
    { count: coverLettersCreated },
    { count: applicationsCreated },
    { data: activeEntitlements },
  ] = await Promise.all([
    // Auth users is the source of truth for total/today/week counts
    admin.rpc("admin_get_user_emails") as Promise<{ data: { id: string; email: string; created_at: string }[] | null; error: unknown }>,
    admin.from("koalapply_events").select("*", { count: "exact", head: true }).eq("event_type", "RESUME_UPLOADED"),
    admin.from("koalapply_events").select("*", { count: "exact", head: true }).eq("event_type", "JOB_ANALYSED"),
    admin.from("koalapply_events").select("*", { count: "exact", head: true }).eq("event_type", "RESUME_GENERATED"),
    admin.from("koalapply_events").select("*", { count: "exact", head: true }).eq("event_type", "COVER_LETTER_CREATED"),
    admin.from("koalapply_events").select("*", { count: "exact", head: true }).eq("event_type", "APPLICATION_CREATED"),
    admin.from("entitlements").select("user_id, plan_type").eq("status", "active").not("stripe_payment_id", "is", null),
  ]);

  // Derive user counts from auth.users (the real source of truth)
  const allUsers = authUsers ?? [];
  const total = allUsers.length;
  const newToday = allUsers.filter((u) => new Date(u.created_at) >= todayStart).length;
  const newWeek  = allUsers.filter((u) => new Date(u.created_at) >= weekStart).length;

  const paid = activeEntitlements ?? [];
  // Deduplicate by user_id so one user with multiple entitlements counts once
  const uniquePaidUserIds = new Set(paid.map((e) => e.user_id as string));
  const paidCount = uniquePaidUserIds.size;

  const mrr = paid.reduce((sum, e) => {
    return sum + (PLAN_PRICES_AUD[e.plan_type as string] ?? 0);
  }, 0);

  const conversionRate = total > 0
    ? Math.min((paidCount / total) * 100, 100).toFixed(1)
    : "0.0";

  return {
    users: {
      total,
      today: newToday,
      thisWeek: newWeek,
    },
    usage: {
      resumesUploaded:       resumesUploaded      ?? 0,
      jobsAnalysed:          jobsAnalysed         ?? 0,
      resumesGenerated:      resumesGenerated     ?? 0,
      coverLettersGenerated: coverLettersCreated  ?? 0,
      applicationsCreated:   applicationsCreated  ?? 0,
    },
    revenue: {
      paidSubscribers: paidCount,
      mrr: mrr > 0 ? mrr.toFixed(0) : "0",
      conversionRate,
    },
  };
}
