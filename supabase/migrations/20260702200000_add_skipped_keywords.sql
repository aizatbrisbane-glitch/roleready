ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS skipped_keywords TEXT[] DEFAULT '{}'::text[];
