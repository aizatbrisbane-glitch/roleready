alter table public.applications
  add column if not exists interview_questions jsonb;
