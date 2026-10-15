import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LifecycleReminderType } from "@/types/database";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

// Free-tier allowance constants — MUST match lib/entitlements.ts exactly.
// getAccessState() cannot be called here because it requires a cookie-based
// SupabaseServerClient (RLS-enforced), whereas classifyUser() must use the
// admin (service_role) client to read email_preferences and lifecycle_email_log,
// which are REVOKE'd from anon/authenticated. Any change to these constants or
// the monthly-reset logic in entitlements.ts must be reflected here and verified
// by the parity tests in tests/lifecycle-eligibility.test.ts.
const FREE_MONTHLY_LIMIT = 1;          // lib/entitlements.ts FREE_MONTHLY_APPLICATION_LIMIT
const FREE_NEWSLETTER_LIMIT = 2;       // lib/entitlements.ts FREE_NEWSLETTER_APPLICATION_LIMIT
const ONBOARDING_WINDOW_HOURS = 14 * 24;
const ACCOUNT_TOO_NEW_HOURS = 24;      // Reminder 1 requires account ≥ 24h old
const TOO_RECENTLY_ACTIVE_HOURS = 48;

// ─── Classification result ────────────────────────────────────────────────────

export type EligibilityClassification =
  | "new_never_used"             // Group A: ≤14 days, free, never generated
  | "new_partially_used"         // Group B: ≤14 days, free, ≥1 generated, remaining, inactive ≥48h
  | "existing_recurring_free"    // Group C: >14 days, free, verified prior usage
  | "free_allowance_exhausted"   // All free credits used this period
  | "active_paid"                // Active non-free entitlement
  | "outside_onboarding_window"  // >14 days, no verified usage history
  | "consent_missing"            // No email_preferences row for lifecycle_marketing
  | "unsubscribed"               // opted_in = false
  | "already_reminded"           // pending/sending/sent row exists for this reminder type
  | "historical_usage_uncertain" // Application records show generation but events+counter don't confirm
  | "account_too_new"            // Account created <24 hours ago
  | "too_recently_active"        // Most recent generation was <48h ago
  | "data_error";                // A required Supabase query returned an error; user cannot be safely classified

// ─── Pure classification input ────────────────────────────────────────────────
//
// Counter semantics (from migrations/20260728000000_add_monthly_generation_counter.sql):
//
//   monthly_generations_used starts at DEFAULT 0. It is only ever set to 1 (first generation
//   in a new reset period via consumeGenerationCredit) or incremented (+1). Application code
//   never sets it back to 0. Deleting an application does NOT decrement it. Therefore:
//
//     monthlyUsedRaw > 0  ⟹  user has generated through the free tier at least once
//     monthlyUsedRaw = 0  ⟹  user has never generated through the free tier
//
//   Paid-tier generations do NOT increment monthly_generations_used — they decrement the
//   entitlement's applications_used counter instead. koalapply_events is the only signal
//   that covers both free and paid generations.

export type ClassificationInput = {
  accountAgeHours: number;
  planType: "free" | "sprint_7_day" | "focus_30_day" | "partner_90_day" | "enterprise_90_day";
  applicationsRemaining: number;
  needsMonthlyReset: boolean;
  monthlyUsedRaw: number;
  // Primary history signal: koalapply_events.RESUME_GENERATED. These rows are NOT cascade-deleted
  // when individual applications are removed. Covers all generations since July 2026.
  hasVerifiedHistoricalUsage: boolean;
  // Secondary history signal: applications.generated_at IS NOT NULL. Less durable — rows are
  // removed when users delete applications or delete their account (CASCADE). Used only to
  // detect a conflict when events are absent but application records exist.
  hasApplicationHistorySignal: boolean;
  lastGeneratedAt: string | null;
  consentOptedIn: boolean | null;       // null = no row in email_preferences
  // failed/uncertain reminder rows must be passed as null — they do not block a new send
  alreadyRemindedStatus: "pending" | "sending" | "sent" | null;
};

export type EligibilitySnapshot = {
  totalAllowance: number;
  used: number;
  remaining: number;
  accountAgeHours: number;
  planType: string;
  classification: EligibilityClassification;
  hasVerifiedHistoricalUsage: boolean;
  needsMonthlyReset: boolean;
  classifiedAt: string;
};

// ─── Pure classification function ─────────────────────────────────────────────
//
// Decision tree (first match wins — order matters):
//
//  1. consent_missing              no email_preferences row
//  2. unsubscribed                 opted_in = false
//  3. already_reminded             pending/sending/sent row for this reminder type
//  4. active_paid                  non-free active entitlement
//  5. outside window (>14 days):
//       existing_recurring_free    verified prior usage
//       outside_onboarding_window  no verified usage
//  6. account_too_new              account < 2h old
//  7. historical_usage_uncertain   app records exist but events+counter empty (signal conflict)
//  8. new_never_used               no history at all (Group A)
//  9. free_allowance_exhausted     remaining = 0
// 10. too_recently_active          generated < 48h ago
// 11. new_partially_used           has used, has remaining, inactive ≥48h (Group B)
//
// NOTE: never returns "data_error" — that is only returned by classifyUser() when a
// Supabase query fails before classifyFromData is reached.

function hoursSince(isoTimestamp: string, now: Date): number {
  return (now.getTime() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60);
}

export function classifyFromData(
  input: ClassificationInput,
  now: Date = new Date()
): EligibilityClassification {
  if (input.consentOptedIn === null) return "consent_missing";
  if (!input.consentOptedIn) return "unsubscribed";

  if (input.alreadyRemindedStatus !== null) return "already_reminded";

  if (input.planType !== "free") return "active_paid";

  if (input.accountAgeHours > ONBOARDING_WINDOW_HOURS) {
    return input.hasVerifiedHistoricalUsage
      ? "existing_recurring_free"
      : "outside_onboarding_window";
  }

  if (input.accountAgeHours < ACCOUNT_TOO_NEW_HOURS) return "account_too_new";

  // Signal conflict: application records show a generation happened, but neither the events
  // table nor the monthly counter confirm it. Possible causes:
  //   - Pre-events-table generation (koalapply_events added July 2026; such users are
  //     almost always >14 days old and never reach this check)
  //   - Event-write failure alongside counter not being incremented (rare bug scenario)
  // Conservative: exclude rather than misclassify as a first-time user.
  if (
    !input.hasVerifiedHistoricalUsage &&
    input.monthlyUsedRaw === 0 &&
    input.hasApplicationHistorySignal
  ) {
    return "historical_usage_uncertain";
  }

  // At this point all available signals are consistent.
  // monthlyUsedRaw > 0 covers free-tier usage; hasVerifiedHistoricalUsage covers
  // paid-tier usage (paid generations write events but not the monthly counter).
  const hasUsed = input.hasVerifiedHistoricalUsage || input.monthlyUsedRaw > 0;

  if (!hasUsed) return "new_never_used";

  if (input.applicationsRemaining === 0) return "free_allowance_exhausted";

  if (
    input.lastGeneratedAt !== null &&
    hoursSince(input.lastGeneratedAt, now) < TOO_RECENTLY_ACTIVE_HOURS
  ) {
    return "too_recently_active";
  }

  return "new_partially_used";
}

// ─── Async classification ─────────────────────────────────────────────────────

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function classifyUser(
  supabase: AdminClient,
  userId: string,
  reminderType: LifecycleReminderType,
  now: Date = new Date()
): Promise<{ classification: EligibilityClassification; snapshot: EligibilitySnapshot }> {
  const nowIso = now.toISOString();

  const [
    profileResult,
    entitlementResult,
    consentResult,
    reminderResult,
    genEventsResult,
    recentAppResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("newsletter_subscribed, created_at, monthly_generations_used, monthly_generations_reset_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("entitlements")
      .select("plan_type, applications_used, application_limit")
      .eq("user_id", userId)
      .eq("status", "active")
      .lte("valid_from", nowIso)
      .gte("valid_until", nowIso)
      .order("valid_until", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("email_preferences")
      .select("opted_in")
      .eq("user_id", userId)
      .eq("preference_type", "lifecycle_marketing")
      .maybeSingle(),
    supabase
      .from("lifecycle_email_log")
      .select("status")
      .eq("user_id", userId)
      .eq("reminder_type", reminderType)
      .maybeSingle(),
    // Primary history signal — not cascade-deleted with individual applications
    supabase
      .from("koalapply_events")
      .select("created_at")
      .eq("user_id", userId)
      .eq("event_type", "RESUME_GENERATED")
      .order("created_at", { ascending: false })
      .limit(1),
    // Secondary history signal — cascade-deleted when the application is removed
    supabase
      .from("applications")
      .select("generated_at")
      .eq("user_id", userId)
      .not("generated_at", "is", null)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // ── Hard fail on any query error ──────────────────────────────────────────
  //
  // A failed entitlement query must not cause a paid user to be classified as free.
  // A failed email-log query must not cause an already-sent reminder to be re-queued.
  // A failed history query must not cause a returning user to be classified as new.
  // Log without PII — no userId, email, or display name in the message.
  const queryErrors: string[] = [
    profileResult.error ? `profiles: ${profileResult.error.message}` : null,
    entitlementResult.error ? `entitlements: ${entitlementResult.error.message}` : null,
    consentResult.error ? `email_preferences: ${consentResult.error.message}` : null,
    reminderResult.error ? `lifecycle_email_log: ${reminderResult.error.message}` : null,
    genEventsResult.error ? `koalapply_events: ${genEventsResult.error.message}` : null,
    recentAppResult.error ? `applications: ${recentAppResult.error.message}` : null,
  ].filter((e): e is string => e !== null);

  if (queryErrors.length > 0) {
    console.error(`[lifecycle-eligibility] data_error — ${queryErrors.join("; ")}`);
    return {
      classification: "data_error",
      snapshot: {
        totalAllowance: 0,
        used: 0,
        remaining: 0,
        accountAgeHours: 0,
        planType: "free",
        classification: "data_error",
        hasVerifiedHistoricalUsage: false,
        needsMonthlyReset: false,
        classifiedAt: nowIso,
      },
    };
  }

  // ── Type assertions (no generated schema) ────────────────────────────────
  type ProfileRow = {
    newsletter_subscribed: boolean;
    created_at: string;
    monthly_generations_used: number;
    monthly_generations_reset_at: string | null;
  };
  type EntitlementRow = { plan_type: string; applications_used: number; application_limit: number };

  const profile = profileResult.data as ProfileRow | null;
  const entitlement = entitlementResult.data as EntitlementRow | null;
  const consentRow = consentResult.data as { opted_in: boolean } | null;
  const reminderRow = reminderResult.data as { status: string } | null;
  const genEvents = (genEventsResult.data ?? []) as { created_at: string }[];
  const recentApp = recentAppResult.data as { generated_at: string } | null;

  // ── Account age ────────────────────────────────────────────────────────────
  // profile null → missing profile → accountAgeHours = 0 → "account_too_new" (safe exclusion)
  const createdAt = profile?.created_at ?? nowIso;
  const accountAgeHours = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  // ── Entitlement / free allowance ───────────────────────────────────────────
  // Parity with getAccessState() in lib/entitlements.ts. See comment at top of file.
  const planType = (entitlement?.plan_type ?? "free") as ClassificationInput["planType"];

  const monthlyResetAt = profile?.monthly_generations_reset_at ?? null;
  const monthlyUsedRaw = profile?.monthly_generations_used ?? 0;
  const needsMonthlyReset =
    !monthlyResetAt || new Date(monthlyResetAt) < new Date(monthStartIso());
  const freeLimit = profile?.newsletter_subscribed ? FREE_NEWSLETTER_LIMIT : FREE_MONTHLY_LIMIT;

  let totalAllowance: number;
  let used: number;
  let applicationsRemaining: number;

  if (entitlement) {
    totalAllowance = entitlement.application_limit;
    used = entitlement.applications_used;
    applicationsRemaining = Math.max(0, totalAllowance - used);
  } else {
    totalAllowance = freeLimit;
    used = needsMonthlyReset ? 0 : monthlyUsedRaw;
    applicationsRemaining = Math.max(0, freeLimit - used);
  }

  // ── History signals ────────────────────────────────────────────────────────
  const hasVerifiedHistoricalUsage = genEvents.length > 0;
  const hasApplicationHistorySignal = recentApp !== null;

  const eventTs = genEvents[0]?.created_at ?? null;
  const appTs = recentApp?.generated_at ?? null;
  let lastGeneratedAt: string | null = null;
  if (eventTs && appTs) {
    lastGeneratedAt = new Date(eventTs) > new Date(appTs) ? eventTs : appTs;
  } else {
    lastGeneratedAt = eventTs ?? appTs ?? null;
  }

  // ── Consent ────────────────────────────────────────────────────────────────
  const consentOptedIn = consentRow === null ? null : Boolean(consentRow.opted_in);

  // ── Existing reminder (failed/uncertain rows do not block a new send attempt) ──
  const existingStatus = reminderRow?.status;
  const alreadyRemindedStatus =
    existingStatus === "pending" || existingStatus === "sending" || existingStatus === "sent"
      ? (existingStatus as "pending" | "sending" | "sent")
      : null;

  const classInput: ClassificationInput = {
    accountAgeHours,
    planType,
    applicationsRemaining,
    needsMonthlyReset,
    monthlyUsedRaw,
    hasVerifiedHistoricalUsage,
    hasApplicationHistorySignal,
    lastGeneratedAt,
    consentOptedIn,
    alreadyRemindedStatus,
  };

  const classification = classifyFromData(classInput, now);

  return {
    classification,
    snapshot: {
      totalAllowance,
      used,
      remaining: applicationsRemaining,
      accountAgeHours: Math.round(accountAgeHours * 10) / 10,
      planType,
      classification,
      hasVerifiedHistoricalUsage,
      needsMonthlyReset,
      classifiedAt: nowIso,
    },
  };
}
