import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLifecycleDryRun } from "@/lib/lifecycle-email-worker";

export const dynamic = "force-dynamic";

// Masks a real email for dry-run display: foo@bar.com → f***@bar.com
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

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

  // ── Query params ──────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

  // ── Run dry-run worker (SELECT-only, zero DB writes) ──────────────────────
  const report = await runLifecycleDryRun(admin, { limit, offset });

  // ── Resolve and mask emails for display ───────────────────────────────────
  //
  // Fetch emails only for the users in this batch. The RPC returns all users,
  // so we filter client-side. Acceptable for bounded batches (max 50 users).
  const userIds = report.results.map((r) => r.userId);
  const emailByUserId: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: emailData } = await admin.rpc("admin_get_user_emails");
    const allEmails = (emailData ?? []) as { id: string; email: string }[];
    const idSet = new Set(userIds);
    for (const u of allEmails) {
      if (idSet.has(u.id)) emailByUserId[u.id] = u.email;
    }
  }

  // ── Build response with masked results (userId never exposed) ─────────────
  const maskedResults = report.results.map((r) => {
    const rawEmail = emailByUserId[r.userId];
    return {
      maskedEmail: rawEmail ? maskEmail(rawEmail) : "(unknown)",
      reminderType: r.reminderType,
      classification: r.classification,
      snapshot: r.snapshot,
      emailPreview: r.emailPreview,
      tokenStatus: r.tokenStatus,
      exclusionReason: r.exclusionReason,
    };
  });

  return NextResponse.json({
    ...report,
    results: maskedResults,
  });
}
