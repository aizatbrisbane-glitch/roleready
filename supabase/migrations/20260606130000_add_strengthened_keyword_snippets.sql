alter table public.applications
  add column if not exists strengthened_keyword_snippets jsonb not null default '{}';
