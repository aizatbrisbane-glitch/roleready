create table if not exists public.cached_grabbed_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  title text not null,
  company text not null,
  location text not null default '',
  salary text not null default '',
  salary_min integer,
  salary_max integer,
  job_url text not null default '',
  description text not null default '',
  match_score integer not null default 0 check (match_score between 0 and 100),
  match_reason text not null default '',
  posted_at timestamptz,
  search_query text not null default '',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists cached_grabbed_jobs_user_score_idx
on public.cached_grabbed_jobs(user_id, fetched_at desc, match_score desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'cached_grabbed_jobs_set_updated_at'
  ) then
    create trigger cached_grabbed_jobs_set_updated_at
    before update on public.cached_grabbed_jobs
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.cached_grabbed_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cached_grabbed_jobs'
      and policyname = 'Users manage their own cached grabbed jobs'
  ) then
    create policy "Users manage their own cached grabbed jobs"
    on public.cached_grabbed_jobs for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;
