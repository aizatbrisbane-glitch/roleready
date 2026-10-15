import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { renderLifecycleEmail } from "@/lib/lifecycle-email-templates";
import { createUnsubscribeToken } from "@/lib/lifecycle-unsubscribe";
import type { LifecycleReminderType } from "@/types/database";

export const dynamic = "force-dynamic";

// Synthetic user IDs used exclusively for preview — never real customer UUIDs.
// The tokens generated here are valid signed tokens but point to non-existent
// accounts, so clicking "unsubscribe" in a preview email has no database effect.
const PREVIEW_USER_ID = "00000000-0000-0000-0000-000000000001";

const VALID_REMINDER_TYPES: LifecycleReminderType[] = ["reminder_1", "reminder_2"];

// Preview scenarios used to exercise template variants.
const SCENARIOS = [
  { id: "1_free_remaining",      label: "1 free application remaining",         firstName: "Alex",             remaining: 1 },
  { id: "2_free_remaining",      label: "2 free applications remaining",         firstName: "Alex",             remaining: 2 },
  { id: "returning_1_remaining", label: "Returning user, 1 application left",   firstName: "Jordan",           remaining: 1 },
  { id: "no_first_name",         label: "Missing first name (fallback greeting)", firstName: null,              remaining: 1 },
  { id: "long_first_name",       label: "Long first name",                       firstName: "Bartholomew-James", remaining: 2 },
] as const;

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

  // ── Query params ─────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const rawType = searchParams.get("reminderType") ?? "reminder_1";
  const reminderType: LifecycleReminderType = VALID_REMINDER_TYPES.includes(
    rawType as LifecycleReminderType
  )
    ? (rawType as LifecycleReminderType)
    : "reminder_1";

  const format = searchParams.get("format") === "text" ? "text" : "html";

  // Generate a synthetic unsubscribe URL — points to a non-existent account.
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://koalapply.com"}/unsubscribe/lifecycle?token=${createUnsubscribeToken()}`;

  const rendered = SCENARIOS.map((scenario) => {
    const email = renderLifecycleEmail({
      reminderType,
      firstName: scenario.firstName,
      remaining: scenario.remaining,
      unsubscribeUrl,
    });
    return {
      id: scenario.id,
      label: scenario.label,
      subject: email.subject,
      content: format === "text" ? email.text : email.html,
    };
  });

  return NextResponse.json({
    reminderType,
    format,
    _syntheticData: true,
    scenarios: rendered,
  });
}
