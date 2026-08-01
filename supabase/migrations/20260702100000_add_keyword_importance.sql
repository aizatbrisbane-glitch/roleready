ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS keyword_importance JSONB DEFAULT '{}'::jsonb;
