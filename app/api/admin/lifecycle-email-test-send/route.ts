import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { renderLifecycleEmail, FROM_ADDRESS } from "@/lib/lifecycle-email-templates";
import type { TailorIntentJobContext } from "@/lib/lifecycle-email-templates";
import type { LifecycleReminderType } from "@/types/database";

export const dynamic = "force-dynamic";

const APP_URL = "https://koalapply.com";
const VALID_REMINDER_TYPES: LifecycleReminderType[] = ["reminder_1", "reminder_2"];

// Non-functional placeholder used for the unsubscribe link in test emails.
// isPlausibleToken() requires exactly 43 base64url chars — this string
// intentionally fails that check, so clicking the link has no DB effect.
const TEST_UNSUB_PLACEHOLDER = "test-send-placeholder-not-functional";

// ─── POST /api/admin/lifecycle-email-test-send ────────────────────────────────
//
// Sends exactly one lifecycle reminder email to a specified address.
//
// Safety properties:
//   • Admin/founder auth required.
//   • Target address is always the explicit `to` field in the request body.
//   • Unsubscribe link uses a non-functional placeholder — no DB row is
//     written, and clicking it affects no account.
//   • tailorIntentJob.ctaUrl must be a relative path or koalapply.com URL.
//   • Completely independent of LIFECYCLE_EMAIL_SENDING_ENABLED.

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

  // ── Parse and validate body ───────────────────────────────────────────────
  let to: string,
    firstName: string | null,
    remaining: number,
    reminderType: LifecycleReminderType;
  let primaryJobTitle: string | null = null;
  let location: string | null = null;
  let tailorIntentJob: TailorIntentJobContext | null = null;

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

    if (typeof body.primaryJobTitle === "string") {
      const v = body.primaryJobTitle.trim();
      if (v.length > 200) {
        return NextResponse.json(
          { error: "primaryJobTitle exceeds 200 characters." },
          { status: 400 }
        );
      }
      primaryJobTitle = v || null;
    }

    if (typeof body.location === "string") {
      const v = body.location.trim();
      if (v.length > 200) {
        return NextResponse.json(
          { error: "location exceeds 200 characters." },
          { status: 400 }
        );
      }
      location = v || null;
    }

    if (body.tailorIntentJob != null) {
      if (typeof body.tailorIntentJob !== "object" || Array.isArray(body.tailorIntentJob)) {
        return NextResponse.json(
          { error: "tailorIntentJob must be an object." },
          { status: 400 }
        );
      }
      const tj = body.tailorIntentJob as Record<string, unknown>;
      const title = typeof tj.title === "string" ? tj.title.trim() : "";
      const company = typeof tj.company === "string" ? tj.company.trim() : "";
      const ctaUrl = typeof tj.ctaUrl === "string" ? tj.ctaUrl.trim() : "";
      const hasResume = typeof tj.hasResume === "boolean" ? tj.hasResume : null;

      if (!title) {
        return NextResponse.json(
          { error: "tailorIntentJob.title must be a non-empty string." },
          { status: 400 }
        );
      }
      if (!company) {
        return NextResponse.json(
          { error: "tailorIntentJob.company must be a non-empty string." },
          { status: 400 }
        );
      }
      if (!ctaUrl) {
        return NextResponse.json(
          { error: "tailorIntentJob.ctaUrl must be a non-empty string." },
          { status: 400 }
        );
      }
      if (hasResume === null) {
        return NextResponse.json(
          { error: "tailorIntentJob.hasResume must be a boolean." },
          { status: 400 }
        );
      }
      if (title.length > 200 || company.length > 200) {
        return NextResponse.json(
          { error: "tailorIntentJob.title and .company must be ≤ 200 characters." },
          { status: 400 }
        );
      }
      // ctaUrl must be a safe relative path or point explicitly to koalapply.com.
      // Inline check avoids type-predicate narrowing issues from isSafeRedirect().
      const ctaUrlSafe =
        (ctaUrl.startsWith("/") && !ctaUrl.startsWith("//")) ||
        ctaUrl.startsWith("https://koalapply.com/");
      if (!ctaUrlSafe) {
        return NextResponse.json(
          { error: "tailorIntentJob.ctaUrl must be a relative path or https://koalapply.com/ URL." },
          { status: 400 }
        );
      }

      tailorIntentJob = { title, company, ctaUrl, hasResume };
    }
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

  // ── Unsubscribe URL (non-functional placeholder) ──────────────────────────
  //
  // No real token is generated and no DB row is written. The unsubscribe page
  // calls isPlausibleToken() which requires exactly 43 base64url chars; the
  // placeholder fails this check, so clicking the link has no database effect.
  const unsubscribeUrl = `${APP_URL}/unsubscribe/lifecycle?token=${encodeURIComponent(TEST_UNSUB_PLACEHOLDER)}`;

  // ── Render ────────────────────────────────────────────────────────────────
  const rendered = renderLifecycleEmail({
    reminderType,
    firstName,
    remaining,
    unsubscribeUrl,
    primaryJobTitle,
    location,
    tailorIntentJob,
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
