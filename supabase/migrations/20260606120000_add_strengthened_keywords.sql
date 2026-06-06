alter table public.applications
  add column if not exists strengthened_keywords text[] not null default '{}';
