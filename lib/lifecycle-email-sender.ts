// ─── Lifecycle Email Sender ───────────────────────────────────────────────────
//
// Implements the full send pipeline:
//   Phase 1 — Maintenance:  resolve stalled 'sending' rows; reset retryable failures.
//   Phase 2 — Schedule:     discover opted-in eligible users; INSERT lifecycle_email_log rows.
//   Phase 3 — Send:         claim pending rows atomically; recheck eligibility; send via Resend.
//
// Sending is disabled by default. The cron endpoint requires
// LIFECYCLE_EMAIL_SENDING_ENABLED=true to activate it.
//
// Duplicate-prevention layers (defence in depth):
//   1. DB UNIQUE(user_id, reminder_type)   — one log row per user per type, ever
//   2. claim_lifecycle_email() CAS         — atomic status 'pending'→'sending'
//   3. classifyUser() already_reminded     — status 'pending'/'sending'/'sent' blocks eligibility
//
// Uncertain delivery (worker crash mid-send):
//   resolve_uncertain_lifecycle_emails() marks rows stuck in 'sending' > 15 min as 'uncertain'.
//   Uncertain rows are NOT auto-retried. They require manual Resend log inspection.

import { Resend } from "resend";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { classifyUser } from "@/lib/lifecycle-eligibility";
import { renderLifecycleEmail, FROM_ADDRESS } from "@/lib/lifecycle-email-templates";
import { createUnsubscribeToken, hashUnsubscribeToken } from "@/lib/lifecycle-unsubscribe";
import type { LifecycleEmailLog, LifecycleReminderType } from "@/types/database";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const APP_URL = "https://koalapply.com";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SendOutcome =
  | "sent"
  | "skipped_ineligible"   // passed pre-send recheck with non-eligible classification
  | "failed_no_email"      // user has no email address on record
  | "failed_send_error"    // Resend API returned an error
  | "claim_failed";        // row was claimed by a concurrent worker

export type SendResult = {
  logId: string;
  userId: string;
  reminderType: LifecycleReminderType;
  outcome: SendOutcome;
  resendMessageId: string | null;
  error: string | null;
};

export type JobReport = {
  scheduledNew: number;
  uncertainResolved: number;
  failedReset: number;
  sent: number;
  skipped: number;
  failed: number;
  results: SendResult[];
};

export type JobOptions = {
  scheduleBatchSize?: number;  // max users to inspect for scheduling (default: 50)
  sendBatchSize?: number;      // max pending rows to send per run (default: 10)
};

// ─── Internal: user profile lookup ───────────────────────────────────────────

async function getUserProfile(
  admin: AdminClient,
  userId: string
): Promise<{ email: string | null; firstName: string | null }> {
  const { data } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return { email: null, firstName: null };
  const profile = data as { name?: string | null; email?: string | null };
  const rawName = profile.name ?? null;
  const firstName = rawName ? rawName.trim().split(" ")[0] || null : null;
  return { email: profile.email ?? null, firstName };
}

// ─── Internal: unsubscribe token provisioning ─────────────────────────────────
//
// Always generates a fresh token and stores its hash. The old token (if any) is
// invalidated. For lifecycle emails (max 2 per user), this is acceptable.

async function provisionUnsubscribeToken(
  admin: AdminClient,
  userId: string
): Promise<string> {
  const token = createUnsubscribeToken();
  const hash = hashUnsubscribeToken(token);

  await admin
    .from("email_preferences")
    .update({ unsubscribe_token_hash: hash })
    .eq("user_id", userId)
    .eq("preference_type", "lifecycle_marketing");

  return token;
}

// ─── Phase 1: Resolve stuck 'sending' rows ────────────────────────────────────

async function resolveStaleSending(admin: AdminClient): Promise<number> {
  const { data, error } = await admin.rpc("resolve_uncertain_lifecycle_emails");
  if (error) {
    console.error("[lifecycle-sender] resolve_uncertain_lifecycle_emails error:", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

// ─── Phase 1b: Reset retryable failures ──────────────────────────────────────

async function resetRetryableFailures(admin: AdminClient): Promise<number> {
  // Query all failed rows (the SQL function handles the cooldown + attempt_count guards).
  const { data: failedRows, error } = await admin
    .from("lifecycle_email_log")
    .select("id")
    .eq("status", "failed");

  if (error || !failedRows?.length) return 0;

  let resetCount = 0;
  for (const row of failedRows) {
    const { data: wasReset } = await admin.rpc("reset_failed_lifecycle_email", {
      p_id: (row as { id: string }).id,
    });
    if (wasReset) resetCount++;
  }
  return resetCount;
}

// ─── Phase 2: Schedule eligible users ────────────────────────────────────────
//
// Discovers opted-in users and INSERTs lifecycle_email_log rows for eligible ones.
// ON CONFLICT DO NOTHING (via unique violation 23505) skips already-scheduled users.
// Processes both reminder types independently.

async function scheduleEligibleUsers(
  admin: AdminClient,
  now: Date,
  limit: number
): Promise<number> {
  const { data: candidates, error } = await admin
    .from("email_preferences")
    .select("user_id")
    .eq("preference_type", "lifecycle_marketing")
    .eq("opted_in", true)
    .limit(limit);

  if (error || !candidates) {
    if (error) console.error("[lifecycle-sender] candidate discovery error:", error.message);
    return 0;
  }

  let scheduledCount = 0;

  for (const row of candidates) {
    const userId = (row as { user_id: string }).user_id;

    for (const reminderType of ["reminder_1", "reminder_2"] as LifecycleReminderType[]) {
      const { classification, snapshot } = await classifyUser(admin, userId, reminderType, now);

      const eligible =
        (reminderType === "reminder_1" && classification === "new_never_used") ||
        (reminderType === "reminder_2" && classification === "new_partially_used");

      if (!eligible) continue;

      const idempotencyKey = `lifecycle:${userId}:${reminderType}`;

      const { error: insertError } = await admin.from("lifecycle_email_log").insert({
        user_id: userId,
        reminder_type: reminderType,
        status: "pending",
        scheduled_for: now.toISOString(),
        idempotency_key: idempotencyKey,
        eligible_snapshot: {
          total_allowance: snapshot.totalAllowance,
          used: snapshot.used,
          remaining: snapshot.remaining,
          account_age_h: Math.round(snapshot.accountAgeHours),
          plan_type: snapshot.planType,
          classification: snapshot.classification,
        },
      });

      if (!insertError) {
        scheduledCount++;
      } else if ((insertError as { code?: string }).code !== "23505") {
        // 23505 = unique_violation (row already exists) — expected, not an error
        console.error("[lifecycle-sender] schedule insert error:", insertError.message);
      }
    }
  }

  return scheduledCount;
}

// ─── Phase 3: Send one pending reminder ──────────────────────────────────────

async function sendOneReminder(
  admin: AdminClient,
  resend: Resend,
  logRow: LifecycleEmailLog,
  now: Date
): Promise<SendResult> {
  const { id: logId, user_id: userId, reminder_type: reminderType } = logRow;

  // 1. Atomic claim: pending → sending. Returns null if another worker beat us.
  const { data: claimed } = await admin.rpc("claim_lifecycle_email", { p_id: logId });
  if (!claimed) {
    return { logId, userId, reminderType, outcome: "claim_failed", resendMessageId: null, error: null };
  }

  // 2. Pre-send eligibility recheck (entitlement may have changed since scheduling).
  const { classification, snapshot } = await classifyUser(admin, userId, reminderType, now);
  const stillEligible =
    (reminderType === "reminder_1" && classification === "new_never_used") ||
    (reminderType === "reminder_2" && classification === "new_partially_used");

  if (!stillEligible) {
    await admin
      .from("lifecycle_email_log")
      .update({ status: "failed", last_error: `ineligible_at_send:${classification}` })
      .eq("id", logId);
    return {
      logId, userId, reminderType,
      outcome: "skipped_ineligible",
      resendMessageId: null,
      error: classification,
    };
  }

  // 3. Look up user email and name.
  const { email, firstName } = await getUserProfile(admin, userId);
  if (!email) {
    await admin
      .from("lifecycle_email_log")
      .update({ status: "failed", last_error: "no_email_address" })
      .eq("id", logId);
    return { logId, userId, reminderType, outcome: "failed_no_email", resendMessageId: null, error: "no_email_address" };
  }

  // 4. Provision a fresh unsubscribe token.
  const unsubToken = await provisionUnsubscribeToken(admin, userId);
  const unsubscribeUrl = `${APP_URL}/unsubscribe/lifecycle?token=${encodeURIComponent(unsubToken)}`;

  // 5. Render email using current snapshot's remaining count (not stale snapshot in DB).
  const rendered = renderLifecycleEmail({
    reminderType,
    firstName,
    remaining: snapshot.remaining,
    unsubscribeUrl,
  });

  // 6. Send via Resend.
  //    On network timeout: do NOT update the row — it stays 'sending' and will be
  //    transitioned to 'uncertain' by resolve_uncertain_lifecycle_emails() next run.
  //
  //    resendCallResult uses a plain shape to avoid discriminated-union narrowing issues
  //    with the Resend SDK's {data,error:null} | {data:null,error} return type.
  let resendCallResult: { messageId: string | null; errorMsg: string | null };

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${rendered.oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    const errMsg = result.error
      ? String((result.error as { message?: string }).message ?? "send_error")
      : null;
    const msgId = result.data
      ? (result.data as { id?: string }).id ?? null
      : null;
    resendCallResult = { messageId: msgId, errorMsg: errMsg };
  } catch (networkError) {
    // Network timeout or unexpected exception. Do NOT update the row — let it go
    // to 'uncertain' after 15 min via resolve_uncertain_lifecycle_emails().
    console.error("[lifecycle-sender] network error sending to", userId, (networkError as Error).message);
    return {
      logId, userId, reminderType,
      outcome: "failed_send_error",
      resendMessageId: null,
      error: (networkError as Error).message,
    };
  }

  if (resendCallResult.errorMsg) {
    await admin
      .from("lifecycle_email_log")
      .update({ status: "failed", last_error: resendCallResult.errorMsg })
      .eq("id", logId);
    return {
      logId, userId, reminderType,
      outcome: "failed_send_error",
      resendMessageId: null,
      error: resendCallResult.errorMsg,
    };
  }

  // 7. Record success. Failure here means the row stays 'sending' → 'uncertain'.
  const resendMessageId = resendCallResult.messageId;
  await admin
    .from("lifecycle_email_log")
    .update({
      status: "sent",
      sent_at: now.toISOString(),
      resend_message_id: resendMessageId,
    })
    .eq("id", logId);

  return { logId, userId, reminderType, outcome: "sent", resendMessageId, error: null };
}

// ─── Phase 3 batch: fetch and send pending rows ───────────────────────────────

async function sendPendingReminders(
  admin: AdminClient,
  resend: Resend,
  now: Date,
  limit: number
): Promise<SendResult[]> {
  const { data: pending, error } = await admin
    .from("lifecycle_email_log")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .lt("attempt_count", 3)          // max_attempts is always 3 (default)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) {
    if (error) console.error("[lifecycle-sender] pending query error:", error.message);
    return [];
  }

  const results: SendResult[] = [];
  for (const row of pending as LifecycleEmailLog[]) {
    const result = await sendOneReminder(admin, resend, row, now);
    results.push(result);
  }
  return results;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runLifecycleEmailJob(
  admin: AdminClient,
  resend: Resend,
  options: JobOptions = {}
): Promise<JobReport> {
  const scheduleBatchSize = Math.min(options.scheduleBatchSize ?? 50, 100);
  const sendBatchSize = Math.min(options.sendBatchSize ?? 10, 25);
  const now = new Date();

  // Phase 1a: resolve stalled 'sending' rows → 'uncertain'
  const uncertainResolved = await resolveStaleSending(admin);

  // Phase 1b: reset retryable failures → back to 'pending'
  const failedReset = await resetRetryableFailures(admin);

  // Phase 2: schedule eligible users (INSERT pending rows)
  const scheduledNew = await scheduleEligibleUsers(admin, now, scheduleBatchSize);

  // Phase 3: claim and send pending rows
  const results = await sendPendingReminders(admin, resend, now, sendBatchSize);

  const sent    = results.filter((r) => r.outcome === "sent").length;
  const skipped = results.filter((r) => r.outcome === "skipped_ineligible" || r.outcome === "claim_failed").length;
  const failed  = results.filter((r) => r.outcome === "failed_no_email" || r.outcome === "failed_send_error").length;

  return { scheduledNew, uncertainResolved, failedReset, sent, skipped, failed, results };
}
