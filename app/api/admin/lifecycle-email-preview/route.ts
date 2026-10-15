import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { classifyUser, type EligibilityClassification, type EligibilitySnapshot } from "@/lib/lifecycle-eligibility";
import type { LifecycleReminderType } from "@/types/database";

export const dynamic = "force-dynamic";

// Masks a real email address for dry-run display: foo@bar.com → f***@bar.com
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

const VALID_REMINDER_TYPES: LifecycleReminderType[] = ["reminder_1", "reminder_2"];
const MAX_PREVIEW_USERS = 100;

export async function GET(request: Request) {
  // ── Admin auth ────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "founder"].includes(profile.role as string)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  // ── Query params ─────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const rawReminderType = searchParams.get("reminderType") ?? "reminder_1";
  const reminderType: LifecycleReminderType = VALID_REMINDER_TYPES.includes(
    rawReminderType as LifecycleReminderType
  )
    ? (rawReminderType as LifecycleReminderType)
    : "reminder_1";

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const filterClassification = searchParams.get("classification") as EligibilityClassification | null;

  // ── Fetch candidate users (created in last 30 days) ───────────────────────
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: profiles }, authResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(MAX_PREVIEW_USERS),
    admin.rpc("admin_get_user_emails"),
  ]);

  const emailByUserId: Record<string, string> = Object.fromEntries(
    ((authResult.data ?? []) as { id: string; email: string }[]).map((u) => [u.id, u.email])
  );

  const userIds = (profiles ?? []).map((p) => (p as { id: string }).id);

  // ── Classify each user ───────────────────────────────────────────────────
  // Sequential batching (10 at a time) to avoid overwhelming the connection pool.
  const BATCH_SIZE = 10;
  const classified: Array<{
    userId: string;
    email: string;
    classification: EligibilityClassification;
    snapshot: EligibilitySnapshot;
  }> = [];

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (userId) => {
        const { classification, snapshot } = await classifyUser(admin, userId, reminderType, now);
        return {
          userId,
          email: emailByUserId[userId] ?? "",
          classification,
          snapshot,
        };
      })
    );
    classified.push(...results);
  }

  // ── Breakdown across all users ────────────────────────────────────────────
  const breakdown: Partial<Record<EligibilityClassification, number>> = {};
  for (const r of classified) {
    breakdown[r.classification] = (breakdown[r.classification] ?? 0) + 1;
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = filterClassification
    ? classified.filter((r) => r.classification === filterClassification)
    : classified;

  // ── Paginate ──────────────────────────────────────────────────────────────
  const total = filtered.length;
  const start = (page - 1) * limit;
  const pageSlice = filtered.slice(start, start + limit);

  // ── Mask emails (dry-run — never expose real addresses) ──────────────────
  const users = pageSlice.map((r) => ({
    userId: r.userId,
    email: maskEmail(r.email),
    accountAgeHours: r.snapshot.accountAgeHours,
    classification: r.classification,
    snapshot: r.snapshot,
  }));

  return NextResponse.json({
    reminderType,
    users,
    breakdown,
    total,
    page,
    limit,
    // Remind callers this is read-only — no emails are sent or queued by this endpoint
    _dryRun: true,
  });
}
