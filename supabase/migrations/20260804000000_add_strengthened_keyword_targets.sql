alter table applications
  add column if not exists strengthened_keyword_targets jsonb not null default '{}'::jsonb;
