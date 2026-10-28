// ─── Lifecycle Email Worker — Dry-Run Only ────────────────────────────────────
//
// This module identifies eligible users and prepares lifecycle reminder emails.
// It is STRUCTURALLY UNABLE to send emails:
//
//   • No Resend client is imported or instantiated.
//   • No email-sending function exists.
//   • The only available execution mode is dry-run (read-only).
//   • Running this module performs ZERO database writes.
//
// Dry-run guarantees:
//   • Does not insert or update lifecycle_email_log rows.
//   • Does not create or rotate unsubscribe tokens.
//   • Does not change user consent.
//   • Does not increment attempt_count.
//   • Does not call claim_lifecycle_email().
//   • Does not dispatch analytics.
//   • Database access is SELECT-only.
//
// When the sending worker is eventually built (Checkpoint 4C+), it will be a
// separate module that imports this worker's types and eligibility logic, adds
// its own DB write and Resend call, and is gated behind explicit feature flags
// reviewed in a separate checkpoint.

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { classifyUser } from "@/lib/lifecycle-eligibility";
import { renderLifecycleEmail } from "@/lib/lifecycle-email-templates";
import type { TailorIntentJobContext } from "@/lib/lifecycle-email-templates";
import type { EligibilityClassification, EligibilitySnapshot } from "@/lib/lifecycle-eligibility";
import type { LifecycleReminderType } from "@/types/database";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const APP_URL = "https://koalapply.com";

// ─── Tailor-intent job lookup ─────────────────────────────────────────────────
//
// Fetch the most recent Tailor-intent saved/new application for a user that
// has not been generated yet. Used to personalise Reminder 1 emails.
// Returns null when no qualifying application exists or on query error.

async function fetchTailorIntentJob(
  admin: AdminClient,
  userId: string
): Promise<TailorIntentJobContext | null> {
  const [appResult, resumeResult] = await Promise.all([
    admin
      .from("applications")
      .select("id, jobs(title, company)")
      .eq("user_id", userId)
      .eq("tailor_intent", true)
      .in("status", ["Saved", "New"])
      .is("generated_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("master_resumes")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (appResult.error || !appResult.data) return null;

  const row = appResult.data as unknown as { id: string; jobs: { title: string; company: string } | null };
  if (!row.jobs) return null;

  return {
    title: row.jobs.title,
    company: row.jobs.company,
    ctaUrl: `${APP_URL}/`,
    hasResume: resumeResult.data !== null,
  };
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type DryRunTokenStatus =
  | "available"          // unsubscribe_token_hash is already set for this user's preference row
  | "needs_provisioning" // no hash stored yet; a token must be generated at send time
  | "n/a";               // user is not eligible — token status irrelevant

export type DryRunCandidateResult = {
  // userId is retained for internal use (admin endpoint masks it before display).
  userId: string;
  reminderType: LifecycleReminderType | "none";
  classification: EligibilityClassification;
  snapshot: EligibilitySnapshot;
  // Non-null only when classification indicates eligibility.
  emailPreview: {
    subject: string;
    // First name is not masked here — the admin endpoint decides display format.
    firstName: string | null;
    remaining: number;
    ctaUrl: string;
  } | null;
  tokenStatus: DryRunTokenStatus;
  exclusionReason: string | null;
};

export type DryRunSummary = {
  reminder1Eligible: number;
  reminder2Eligible: number;
  excluded: Record<string, number>;
  tokensMissing: number;
  dataErrors: number;
};

export type DryRunReport = {
  _dryRun: true;
  evaluatedAt: string;
  batchOffset: number;
  batchLimit: number;
  candidatesQueried: number;
  results: DryRunCandidateResult[];
  summary: DryRunSummary;
};

// ─── Exclusion reason labels ──────────────────────────────────────────────────

const EXCLUSION_LABELS: Record<EligibilityClassification, string> = {
  new_never_used:             "eligible_reminder_1",   // not an exclusion
  new_partially_used:         "eligible_reminder_2",   // not an exclusion
  existing_recurring_free:    "existing_recurring_free",
  free_allowance_exhausted:   "free_allowance_exhausted",
  active_paid:                "active_paid",
  outside_onboarding_window:  "outside_onboarding_window",
  consent_missing:            "consent_missing",
  unsubscribed:               "unsubscribed",
  already_reminded:           "already_reminded",
  historical_usage_uncertain: "historical_usage_uncertain",
  account_too_new:            "account_too_new",
  too_recently_active:        "too_recently_active",
  data_error:                 "data_error",
};

// ─── Candidate discovery ──────────────────────────────────────────────────────
//
// Fetches a bounded page of users who have opted in to lifecycle reminders.
// Returns raw user IDs — eligibility is determined later by classifyUser().
// No filtering by account age here: classifyUser() handles that authoritatively.

async function discoverCandidates(
  admin: AdminClient,
  limit: number,
  offset: number
): Promise<{ userIds: string[]; total: number }> {
  const { data, error, count } = await admin
    .from("email_preferences")
    .select("user_id", { count: "exact" })
    .eq("preference_type", "lifecycle_marketing")
    .eq("opted_in", true)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[lifecycle-worker] candidate discovery failed:", error.message);
    return { userIds: [], total: 0 };
  }

  return {
    userIds: (data ?? []).map((r: { user_id: string }) => r.user_id),
    total: count ?? 0,
  };
}

// ─── Token status check ───────────────────────────────────────────────────────
//
// Checks whether a user already has an unsubscribe_token_hash stored.
// Does NOT create a token — that must happen at actual send time (Checkpoint 4C+).

async function checkTokenStatus(
  admin: AdminClient,
  userId: string
): Promise<DryRunTokenStatus> {
  const { data, error } = await admin
    .from("email_preferences")
    .select("unsubscribe_token_hash")
    .eq("user_id", userId)
    .eq("preference_type", "lifecycle_marketing")
    .maybeSingle();

  if (error || !data) return "needs_provisioning";
  const row = data as { unsubscribe_token_hash: string | null };
  return row.unsubscribe_token_hash ? "available" : "needs_provisioning";
}

// ─── Profile fetch (for email preview) ───────────────────────────────────────

async function fetchProfileBasics(
  admin: AdminClient,
  userId: string
): Promise<{ firstName: string | null; email: string | null; primaryJobTitle: string | null; location: string | null }> {
  const { data } = await admin
    .from("profiles")
    .select("name, email, target_job_titles, location")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return { firstName: null, email: null, primaryJobTitle: null, location: null };
  const profile = data as {
    name?: string | null;
    email?: string | null;
    target_job_titles?: string[] | null;
    location?: string | null;
  };
  const rawName = profile.name ?? null;
  const firstName = rawName ? rawName.trim().split(" ")[0] || null : null;
  const titles = Array.isArray(profile.target_job_titles) ? profile.target_job_titles : [];
  const primaryJobTitle = titles.length > 0 && titles[0].trim() ? titles[0].trim() : null;
  const rawLocation = profile.location ?? null;
  const location = rawLocation ? rawLocation.trim() || null : null;
  return { firstName, email: profile.email ?? null, primaryJobTitle, location };
}

// ─── Evaluate a single candidate ─────────────────────────────────────────────
//
// Evaluates both reminder types for the candidate and returns the best match.
// Two classification calls are made per user — this is acceptable for a bounded
// diagnostic batch (max 25 users) where correctness outweighs performance.

async function evaluateCandidate(
  admin: AdminClient,
  userId: string,
  now: Date
): Promise<DryRunCandidateResult> {
  // Evaluate for reminder_1 and reminder_2 in parallel.
  const [r1, r2] = await Promise.all([
    classifyUser(admin, userId, "reminder_1", now),
    classifyUser(admin, userId, "reminder_2", now),
  ]);

  // Determine the eligible type (mutually exclusive).
  let reminderType: LifecycleReminderType | "none" = "none";
  let classResult = r1;

  if (r1.classification === "new_never_used") {
    reminderType = "reminder_1";
    classResult = r1;
  } else if (r2.classification === "new_partially_used") {
    reminderType = "reminder_2";
    classResult = r2;
  } else {
    // Not eligible — use r1 as canonical exclusion reason (covers consent,
    // unsubscribed, active_paid, outside window, etc. which are type-agnostic).
    classResult = r1;
  }

  const classification = classResult.classification;
  const snapshot = classResult.snapshot;
  const isEligible = reminderType !== "none";

  // Check token status only for eligible users (avoids unnecessary queries).
  const tokenStatus: DryRunTokenStatus = isEligible
    ? await checkTokenStatus(admin, userId)
    : "n/a";

  if (!isEligible) {
    return {
      userId,
      reminderType: "none",
      classification,
      snapshot,
      emailPreview: null,
      tokenStatus: "n/a",
      exclusionReason: EXCLUSION_LABELS[classification] ?? classification,
    };
  }

  // Build email preview (synthetic unsubscribe URL — no real token created).
  const [{ firstName, primaryJobTitle, location }, tailorIntentJob] = await Promise.all([
    fetchProfileBasics(admin, userId),
    reminderType === "reminder_1" ? fetchTailorIntentJob(admin, userId) : Promise.resolve(null),
  ]);
  const syntheticUnsubUrl = `${APP_URL}/unsubscribe/lifecycle?token=DRY_RUN_ONLY`;

  const rendered = renderLifecycleEmail({
    reminderType: reminderType as LifecycleReminderType,
    firstName,
    remaining: snapshot.remaining,
    unsubscribeUrl: syntheticUnsubUrl,
    tailorIntentJob,
    primaryJobTitle,
    location,
  });

  return {
    userId,
    reminderType,
    classification,
    snapshot,
    emailPreview: {
      subject: rendered.subject,
      firstName,
      remaining: snapshot.remaining,
      ctaUrl: APP_URL + "/",
    },
    tokenStatus,
    exclusionReason: null,
  };
}

// ─── Public dry-run entry point ───────────────────────────────────────────────

export async function runLifecycleDryRun(
  admin: AdminClient,
  options: { limit?: number; offset?: number } = {}
): Promise<DryRunReport> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  const now = new Date();
  const evaluatedAt = now.toISOString();

  // Step 1: discover opted-in candidates.
  const { userIds, total } = await discoverCandidates(admin, limit, offset);

  // Step 2: evaluate each candidate (parallel, bounded by limit).
  const results = await Promise.all(
    userIds.map((userId) => evaluateCandidate(admin, userId, now))
  );

  // Step 3: aggregate summary.
  const summary: DryRunSummary = {
    reminder1Eligible: 0,
    reminder2Eligible: 0,
    excluded: {},
    tokensMissing: 0,
    dataErrors: 0,
  };

  for (const r of results) {
    if (r.reminderType === "reminder_1") {
      summary.reminder1Eligible++;
      if (r.tokenStatus === "needs_provisioning") summary.tokensMissing++;
    } else if (r.reminderType === "reminder_2") {
      summary.reminder2Eligible++;
      if (r.tokenStatus === "needs_provisioning") summary.tokensMissing++;
    } else {
      const label = r.exclusionReason ?? "unknown";
      summary.excluded[label] = (summary.excluded[label] ?? 0) + 1;
    }
    if (r.classification === "data_error") summary.dataErrors++;
  }

  return {
    _dryRun: true,
    evaluatedAt,
    batchOffset: offset,
    batchLimit: limit,
    candidatesQueried: userIds.length,
    results,
    summary,
  };
}
