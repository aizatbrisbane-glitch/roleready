-- References master list
create table if not exists public.references (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  position   text,
  company    text,
  phone      text,
  email      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.references enable row level security;

create policy "Users manage own references"
  on public.references for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger references_set_updated_at
  before update on public.references
  for each row execute function public.set_updated_at();

-- Add reference tracking to applications
alter table public.applications
  add column if not exists reference_ids uuid[] default '{}',
  add column if not exists include_references_in_cv boolean default false;
