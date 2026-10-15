-- ============================================================
-- Lifecycle Email Foundation — Checkpoint 1 (corrected)
-- ============================================================
-- Creates the database foundation for lifecycle email delivery.
-- Does NOT implement sending logic or eligibility processing.
--
-- APPLY TO PRODUCTION: only after Checkpoint 1 review, consent
-- model decision, and explicit approval.
--
-- Tables:
--   public.lifecycle_email_log   — delivery tracking per user per type
--   public.email_preferences     — per-user lifecycle opt-in / opt-out
--
-- Functions:
--   claim_lifecycle_email(uuid)              — atomic worker claim (CAS)
--   resolve_uncertain_lifecycle_emails()     — stuck-sending cleanup
--   reset_failed_lifecycle_email(uuid)       — retry gate for failed rows
--
-- ============================================================


-- ============================================================
-- 1.  lifecycle_email_log
-- ============================================================
--
-- State machine:
--
--   pending    → queued, not yet attempted
--   sending    → claimed by a worker; blocks concurrent sends for this row
--   sent       → Resend confirmed receipt; resend_message_id populated
--   failed     → send attempt failed; may be retried via
--                reset_failed_lifecycle_email() if attempt_count < max_attempts
--   uncertain  → worker died mid-send, delivery state unknown; requires
--                manual investigation before retry (never auto-retried)
--
-- Retry path:
--   failed → [reset_failed_lifecycle_email()] → pending → [claim_lifecycle_email()] → sending → …
--
-- Duplicate prevention (two independent layers):
--
--   Layer 1 — database uniqueness:
--     UNIQUE (user_id, reminder_type) enforces exactly one lifecycle record
--     per user per email type, ever. All retries are UPDATE operations on the
--     existing row, not new INSERTs. No concurrent worker can accidentally
--     create a second row.
--
--   Layer 2 — idempotency key:
--     idempotency_key is a deterministic string passed to Resend's emails.send()
--     API, preventing Resend from delivering a duplicate if the application
--     retries the HTTP call within Resend's deduplication window.
--     Format: 'lifecycle:{user_id}:{reminder_type}'
--
-- IMPORTANT — Resend idempotency window:
--     Resend's idempotency key provides deduplication only within a limited
--     time window (typically 24 hours; exact duration is not guaranteed by
--     Resend's documentation and may change). It is NOT a permanent guarantee
--     against double delivery. The primary protection against duplicate sends
--     is the database UNIQUE constraint and the 'sent' status check in the
--     eligibility query. Do not rely on the idempotency key as the sole
--     safeguard after the window has elapsed.
--
-- Uncertain delivery:
--     If the sending worker crashes or times out after calling Resend but
--     before recording the response, the row remains 'sending'. The next
--     cron run calls resolve_uncertain_lifecycle_emails() which marks such
--     rows 'uncertain' after 15 minutes. The worker must then manually check
--     Resend delivery logs using idempotency_key before resetting to 'failed'
--     for retry. Do NOT auto-retry uncertain rows.
--
-- Eligibility re-check before send:
--     The sending worker MUST re-verify eligibility (via getAccessState() and
--     the classification module) immediately after claiming a row via
--     claim_lifecycle_email(). The user's entitlement state may have changed
--     between initial queueing and actual delivery.
--
-- Click attribution:
--     click_token is a random UUID embedded in the CTA URL. When redeemed
--     by a redirect or middleware endpoint, clicked_at is stamped. This
--     enables funnel measurement without third-party pixels.

CREATE TABLE public.lifecycle_email_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type       text        NOT NULL
                      CHECK (reminder_type IN ('reminder_1', 'reminder_2')),
  status              text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'uncertain')),

  -- Timing
  created_at          timestamptz NOT NULL DEFAULT now(),
  scheduled_for       timestamptz,           -- target send window; supports AEST scheduling
  sent_at             timestamptz,           -- stamped when status → 'sent'
  last_attempted_at   timestamptz,           -- updated on every claim attempt

  -- Resend delivery
  resend_message_id   text        UNIQUE,    -- populated on 'sent'; UNIQUE prevents double-recording
  idempotency_key     text        UNIQUE,    -- passed to Resend; set at INSERT time by the sending worker
                                             -- format: 'lifecycle:{user_id}:{reminder_type}'

  -- Click attribution
  click_token         text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  clicked_at          timestamptz,

  -- Retry tracking
  attempt_count       integer     NOT NULL DEFAULT 0,
  max_attempts        integer     NOT NULL DEFAULT 3,
  last_error          text,

  -- Eligibility snapshot at time of queueing (for audit / drift detection)
  -- Fields: total_allowance, used, remaining, account_age_h, plan_type, classification
  eligible_snapshot   jsonb       NOT NULL DEFAULT '{}',

  -- Primary deduplication: one lifecycle record per user per email type, ever
  UNIQUE (user_id, reminder_type)
);

-- Fast drain of pending rows, ordered by intended send time
CREATE INDEX lifecycle_email_log_pending_idx
  ON public.lifecycle_email_log (scheduled_for)
  WHERE status = 'pending';

-- Stuck-sending cleanup: find rows in 'sending' state older than 15 minutes
CREATE INDEX lifecycle_email_log_sending_aged_idx
  ON public.lifecycle_email_log (last_attempted_at)
  WHERE status = 'sending';

-- Eligibility query support: has user already been sent / is in-flight for a given type?
CREATE INDEX lifecycle_email_log_user_type_status_idx
  ON public.lifecycle_email_log (user_id, reminder_type, status);

-- Click-token redemption
CREATE INDEX lifecycle_email_log_click_token_idx
  ON public.lifecycle_email_log (click_token)
  WHERE clicked_at IS NULL;


-- ============================================================
-- 2.  email_preferences
-- ============================================================
--
-- Stores per-user, per-type opt-in/opt-out state.
-- Extensible: add new preference_type values to the CHECK constraint
-- as new email categories are introduced.
--
-- CONSENT MODEL — DECISIONS REQUIRED BEFORE PRODUCTION:
--
--   opted_in DEFAULT false.
--   Existing users are NOT auto-enrolled.
--   No lifecycle email is ever sent to a user without opted_in = true.
--
--   Three options for how users get opted_in = true (decision needed before
--   Checkpoint 6):
--
--     Option A (express consent):
--       Add a checkbox to the signup flow, clearly labelled for job search
--       reminders. opted_in = true only when the user ticks it.
--
--     Option B (inferred consent + easy opt-out):
--       New users default opted_in = true at profile creation.
--       Every lifecycle email includes a one-click unsubscribe link that
--       sets opted_in = false via a signed endpoint.
--       Requires unsubscribe endpoint (Checkpoint 3).
--
--     Option C (admin bulk import with consent basis):
--       Owner reviews existing users and manually enables opted_in = true
--       for a cohort with a documented consent basis, after legal review.
--
-- NEWSLETTER CONSENT vs LIFECYCLE CONSENT:
--   profiles.newsletter_subscribed covers "career tips and job search advice"
--   — the current checkbox wording is not specific to activation reminders.
--   A user who subscribed to the newsletter may or may not have consented to
--   lifecycle product reminders. These are separate signals and must not be
--   conflated. The lifecycle system uses email_preferences, not
--   newsletter_subscribed, as its gate.
--
-- AUSTRALIAN SPAM ACT 2003 (Cth) — flagged for legal/product review:
--   Whether lifecycle activation reminder emails constitute "commercial
--   electronic messages" requiring express or inferred consent, and whether
--   Koalapply has a sufficient existing relationship to rely on inferred
--   consent for existing users, is a legal question not resolved here.
--   This table provides the mechanism to enforce whichever model is decided.

CREATE TABLE public.email_preferences (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type  text        NOT NULL
                   CHECK (preference_type IN ('lifecycle_marketing')),
                   -- Extend this CHECK as new types are introduced.
  opted_in         boolean     NOT NULL DEFAULT false,
  source           text,
                   -- Audit trail of how the preference was set:
                   --   'signup_flow'        — checkbox at account creation
                   --   'in_app_settings'    — user changed in their account
                   --   'unsubscribe_link'   — user clicked unsubscribe
                   --   'admin_backfill'     — bulk import after legal review
                   --   'inferred'           — business relationship basis
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- UNSUBSCRIBE TOKEN HASH
  -- The email footer contains a 32-byte base64url plaintext token (256 bits).
  -- This column stores SHA-256(token) — only the hash, never the plaintext.
  --
  -- Why a hash?
  --   Defense-in-depth: a full DB read (compromised service_role key, data
  --   breach) cannot extract tokens to silently mass-unsubscribe users.
  --   256-bit preimages are computationally infeasible to reverse.
  --
  -- Lifecycle: set when the first email for this row is sent (Checkpoint 4).
  -- Rotation: generate a new token, compute SHA-256, UPDATE this column.
  --   Old emails for this (user_id, reminder_type) row will stop working;
  --   other rows (other preference_types or other users) are unaffected.
  unsubscribe_token_hash  text        UNIQUE,

  UNIQUE (user_id, preference_type)
);

-- Fast eligibility filter: opted-in users only
CREATE INDEX email_preferences_opted_in_idx
  ON public.email_preferences (preference_type, user_id)
  WHERE opted_in = true;

-- Unsubscribe and preference lookups
CREATE INDEX email_preferences_user_type_idx
  ON public.email_preferences (user_id, preference_type);

-- Fast unsubscribe token hash lookup (NULL hashes excluded — not yet assigned)
CREATE INDEX email_preferences_unsub_token_hash_idx
  ON public.email_preferences (unsubscribe_token_hash)
  WHERE unsubscribe_token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_email_preferences_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_preferences_set_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_email_preferences_updated_at();


-- ============================================================
-- 3.  Row Level Security — service_role only
-- ============================================================

ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lifecycle_email_log FROM anon, authenticated;
REVOKE ALL ON public.email_preferences   FROM anon, authenticated;

GRANT ALL ON public.lifecycle_email_log TO service_role;
GRANT ALL ON public.email_preferences   TO service_role;


-- ============================================================
-- 4.  claim_lifecycle_email — atomic worker claim (compare-and-swap)
-- ============================================================
-- Called by the cron worker immediately before sending an email.
-- Atomically transitions status 'pending' → 'sending'.
-- Returns the claimed row on success, or NULL if:
--   • the row was already claimed by a concurrent worker
--   • the row no longer exists
--   • the row is not in 'pending' state
--
-- The sending worker MUST:
--   1. Re-verify user eligibility after claiming (entitlement may have changed).
--   2. Call Resend with idempotency_key.
--   3. On Resend success:  UPDATE status = 'sent', sent_at, resend_message_id.
--   4. On Resend error:    UPDATE status = 'failed', last_error.
--   5. On network timeout: do nothing; the row stays 'sending' and will be
--                          transitioned to 'uncertain' by
--                          resolve_uncertain_lifecycle_emails() on the next run.

CREATE OR REPLACE FUNCTION public.claim_lifecycle_email(p_id uuid)
RETURNS public.lifecycle_email_log
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  claimed public.lifecycle_email_log;
BEGIN
  UPDATE public.lifecycle_email_log
  SET
    status            = 'sending',
    last_attempted_at = now(),
    attempt_count     = attempt_count + 1
  WHERE id = p_id
    AND status = 'pending'              -- compare-and-swap guard
  RETURNING * INTO claimed;
  RETURN claimed;                       -- NULL if guard failed
END;
$$;

REVOKE ALL     ON FUNCTION public.claim_lifecycle_email(uuid) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_lifecycle_email(uuid) TO service_role;


-- ============================================================
-- 5.  resolve_uncertain_lifecycle_emails — stuck-sending cleanup
-- ============================================================
-- Marks rows stuck in 'sending' for more than 15 minutes as 'uncertain'.
-- Must be called at the START of each cron run before processing pending rows.
-- Returns the number of rows transitioned.
--
-- 'uncertain' rows must NOT be auto-retried.
-- Before resetting an uncertain row to 'failed':
--   1. Check idempotency_key against Resend's delivery logs (via Resend dashboard
--      or API) to determine whether the message was actually delivered.
--   2. If delivered: manually set status = 'sent', resend_message_id, sent_at.
--   3. If not delivered: call reset_failed_lifecycle_email() to allow retry.

CREATE OR REPLACE FUNCTION public.resolve_uncertain_lifecycle_emails()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer;
BEGIN
  WITH resolved AS (
    UPDATE public.lifecycle_email_log
    SET status = 'uncertain'
    WHERE status = 'sending'
      AND last_attempted_at < now() - interval '15 minutes'
    RETURNING id
  )
  SELECT count(*) INTO n FROM resolved;
  RETURN n;
END;
$$;

REVOKE ALL     ON FUNCTION public.resolve_uncertain_lifecycle_emails() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.resolve_uncertain_lifecycle_emails() TO service_role;


-- ============================================================
-- 6.  reset_failed_lifecycle_email — retry gate
-- ============================================================
-- Resets a 'failed' row back to 'pending' so the next cron run retries it.
-- Guards:
--   • Only 'failed' rows can be reset (not 'uncertain' — those require manual review).
--   • attempt_count must be below max_attempts.
--   • Enforces a cooldown period (default 60 minutes) since last attempt to
--     prevent rapid retry storms on transient failures.
--
-- Returns TRUE if the row was reset, FALSE otherwise.
--
-- Typical usage from a cron job managing retries:
--   SELECT reset_failed_lifecycle_email(id) FROM lifecycle_email_log
--   WHERE status = 'failed' AND attempt_count < max_attempts
--     AND last_attempted_at < now() - interval '60 minutes';

CREATE OR REPLACE FUNCTION public.reset_failed_lifecycle_email(
  p_id               uuid,
  p_cooldown_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reset_ok boolean;
BEGIN
  UPDATE public.lifecycle_email_log
  SET
    status     = 'pending',
    last_error = NULL
  WHERE id = p_id
    AND status = 'failed'                            -- only failed rows (not uncertain)
    AND attempt_count < max_attempts                 -- within retry limit
    AND last_attempted_at < now() - make_interval(mins => p_cooldown_minutes)
  RETURNING TRUE INTO reset_ok;
  RETURN COALESCE(reset_ok, FALSE);
END;
$$;

REVOKE ALL     ON FUNCTION public.reset_failed_lifecycle_email(uuid, integer) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reset_failed_lifecycle_email(uuid, integer) TO service_role;
