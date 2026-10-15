import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderLifecycleEmail, FROM_ADDRESS } from "@/lib/lifecycle-email-templates";
import { createUnsubscribeToken, hashUnsubscribeToken } from "@/lib/lifecycle-unsubscribe";
import type { LifecycleReminderType } from "@/types/database";

export const dynamic = "force-dynamic";

const APP_URL = "https://koalapply.com";
const VALID_REMINDER_TYPES: LifecycleReminderType[] = ["reminder_1", "reminder_2"];

// ─── POST /api/admin/lifecycle-email-test-send ────────────────────────────────
//
// Sends exactly one lifecycle reminder email to a specified address.
//
// Safety properties:
//   • Admin/founder auth required — cannot be called by anonymous or regular users.
//   • Target address is always the explicit `to` field — no customer addresses
//     are ever selected or contacted by this endpoint.
//   • Unsubscribe token is linked to the calling admin's OWN email_preferences row.
//     Clicking unsubscribe in the test email updates only that row, not any customer.
//   • Completely independent of LIFECYCLE_EMAIL_SENDING_ENABLED — the feature flag
//     guards the batch cron job, not this one-off test endpoint.

export async function POST(request: Request) {
  // ── Auth: admin/founder only ──────────────────────────────────────────────
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

  // ── Parse body ────────────────────────────────────────────────────────────
  let to: string,
    firstName: string | null,
    remaining: number,
    reminderType: LifecycleReminderType;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    to = typeof body.to === "string" ? body.to.trim() : "";
    firstName =
      typeof body.firstName === "string" ? body.firstName.trim() || null : null;
    remaining =
      typeof body.remaining === "number"
        ? Math.max(0, Math.floor(body.remaining))
        : 2;
    const rawType = body.reminderType ?? "reminder_1";
    reminderType = VALID_REMINDER_TYPES.includes(rawType as LifecycleReminderType)
      ? (rawType as LifecycleReminderType)
      : "reminder_1";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Invalid 'to' address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured." }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });
  }

  // ── Provision unsubscribe token for the admin's own account ──────────────
  //
  // Upserts an email_preferences row for the calling admin user so the
  // unsubscribe link in the test email resolves to a real DB row.
  // Clicking it updates ONLY this admin's row — no customer data is touched.
  const unsubToken = createUnsubscribeToken();
  const tokenHash = hashUnsubscribeToken(unsubToken);

  const { error: prefError } = await admin.from("email_preferences").upsert(
    {
      user_id: user.id,
      preference_type: "lifecycle_marketing",
      opted_in: true,
      source: "test_send",
      unsubscribe_token_hash: tokenHash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,preference_type" }
  );

  if (prefError) {
    return NextResponse.json(
      { error: `Preference upsert failed: ${prefError.message}` },
      { status: 500 }
    );
  }

  const unsubscribeUrl = `${APP_URL}/unsubscribe/lifecycle?token=${encodeURIComponent(unsubToken)}`;

  // ── Render ────────────────────────────────────────────────────────────────
  const rendered = renderLifecycleEmail({
    reminderType,
    firstName,
    remaining,
    unsubscribeUrl,
  });

  // ── Send via Resend ───────────────────────────────────────────────────────
  const resend = new Resend(apiKey);
  let resendResult: { messageId: string | null; errorMsg: string | null };

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `[TEST SEND] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${rendered.oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Koalapply-Test": "true",
      },
    });
    resendResult = {
      messageId: result.data ? (result.data as { id?: string }).id ?? null : null,
      errorMsg: result.error
        ? String((result.error as { message?: string }).message ?? "send_error")
        : null,
    };
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Network error: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (resendResult.errorMsg) {
    return NextResponse.json({ ok: false, error: resendResult.errorMsg }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    to,
    reminderType,
    resendMessageId: resendResult.messageId,
    subject: `[TEST SEND] ${rendered.subject}`,
    unsubscribeUrl,
    oneClickUnsubscribeUrl: rendered.oneClickUnsubscribeUrl,
  });
}
