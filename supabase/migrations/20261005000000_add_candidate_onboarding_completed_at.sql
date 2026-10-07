-- Add explicit onboarding completion marker for candidate accounts.
--
-- NULL  = candidate has not completed the new canonical onboarding
-- non-null = candidate completed onboarding at this timestamp
--
-- No database DEFAULT is set so that new profiles inserted after this
-- migration retain NULL until they explicitly finish onboarding.
--
-- Existing rows are backfilled to created_at so production users are
-- never sent through onboarding again.

alter table public.profiles
  add column if not exists candidate_onboarding_completed_at timestamptz;

-- Backfill: mark every existing profile as already having completed
-- onboarding (timestamped to their account creation date).
-- The WHERE guard makes this safe to re-run (idempotent).
-- Cutoff = the UTC timestamp encoded in this migration filename.
-- Only profiles created before this boundary are grandfathered.
-- New users who register after deployment retain NULL and will see onboarding.
update public.profiles
  set candidate_onboarding_completed_at = created_at
  where candidate_onboarding_completed_at is null
    and created_at < '2026-10-05 00:00:00+00';
