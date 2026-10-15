import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLifecycleEmailJob } from "@/lib/lifecycle-email-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Lifecycle email cron endpoint ───────────────────────────────────────────
//
// Triggered by Vercel cron (see vercel.json). Schedule: twice daily at
// 09:00 and 15:00 AEST (23:00 and 05:00 UTC), covering both AEST and AEDT.
//
// ACTIVATION:
//   Sending is OFF by default. Set LIFECYCLE_EMAIL_SENDING_ENABLED=true in
//   Vercel environment variables to activate. Without this flag, every cron
//   invocation returns 200 with { enabled: false } and touches nothing.
//
// AUTH:
//   Vercel sets Authorization: Bearer <CRON_SECRET> on all cron requests.
//   Requests without a valid secret are rejected with 401.

export async function GET(request: Request) {
  // ── Auth: timing-safe comparison (same pattern as /api/analytics/dispatch) ──
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const correct = expected ? `Bearer ${expected}` : "";
  const suppliedBytes = Buffer.from(supplied);
  const correctBytes = Buffer.from(correct);
  if (
    !correct ||
    suppliedBytes.length !== correctBytes.length ||
    !timingSafeEqual(suppliedBytes, correctBytes)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Feature flag — must be explicitly enabled ──────────────────────────────
  if (process.env.LIFECYCLE_EMAIL_SENDING_ENABLED !== "true") {
    return NextResponse.json({ enabled: false, message: "Lifecycle email sending is disabled. Set LIFECYCLE_EMAIL_SENDING_ENABLED=true to activate." });
  }

  // ── Infrastructure checks ──────────────────────────────────────────────────
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured." }, { status: 500 });
  }

  // ── Run job ────────────────────────────────────────────────────────────────
  const resend = new Resend(apiKey);
  const report = await runLifecycleEmailJob(admin, resend);

  return NextResponse.json({ ok: true, ...report });
}
