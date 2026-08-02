ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS strengthened_keyword_originals JSONB DEFAULT '{}'::jsonb;
