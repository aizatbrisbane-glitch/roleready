import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function toDateStr(iso: string) {
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

function last30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d.toISOString()));
  }
  return days;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "founder"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [rpcResult, { data: events }] = await Promise.all([
    admin.rpc("admin_get_user_emails"),
    admin
      .from("koalapply_events")
      .select("event_type, created_at")
      .gte("created_at", since.toISOString()),
  ]);

  const authUsers = (rpcResult.data ?? []) as { id: string; email: string; created_at: string }[];

  const days = last30Days();

  // ── Signups per day ──────────────────────────────────────────────────────
  const signupsByDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const u of authUsers ?? []) {
    const d = toDateStr(u.created_at);
    if (d in signupsByDay) signupsByDay[d]++;
  }

  const signups = days.map((date) => ({ date, signups: signupsByDay[date] }));

  // ── Usage events per day ─────────────────────────────────────────────────
  type UsageDay = {
    date: string;
    resumes: number;
    jobs: number;
    aiResumes: number;
    coverLetters: number;
    applications: number;
  };

  const usageByDay: Record<string, Omit<UsageDay, "date">> = Object.fromEntries(
    days.map((d) => [d, { resumes: 0, jobs: 0, aiResumes: 0, coverLetters: 0, applications: 0 }])
  );

  for (const ev of events ?? []) {
    const d = toDateStr(ev.created_at);
    if (!(d in usageByDay)) continue;
    const row = usageByDay[d];
    if (ev.event_type === "RESUME_UPLOADED")      row.resumes++;
    if (ev.event_type === "JOB_ANALYSED")         row.jobs++;
    if (ev.event_type === "RESUME_GENERATED")      row.aiResumes++;
    if (ev.event_type === "COVER_LETTER_CREATED")  row.coverLetters++;
    if (ev.event_type === "APPLICATION_CREATED")   row.applications++;
  }

  const usage: UsageDay[] = days.map((date) => ({ date, ...usageByDay[date] }));

  return NextResponse.json({ signups, usage });
}
