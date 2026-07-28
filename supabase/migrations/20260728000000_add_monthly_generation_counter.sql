-- Add persistent monthly generation counter to profiles.
-- Replaces the live application-count query so deleting applications
-- cannot restore free-tier generation credits.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS monthly_generations_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_generations_reset_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing users so they don't get a free reset on deploy.
UPDATE profiles p
SET
  monthly_generations_used = COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM applications a
    WHERE a.user_id = p.id
      AND a.generated_at IS NOT NULL
      AND a.generated_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
  ), 0),
  monthly_generations_reset_at = date_trunc('month', NOW() AT TIME ZONE 'UTC');
