alter table public.jobs
  add column if not exists expires_at date;
