create table if not exists public.master_cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  storage_path text,
  cover_letter_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'master_cover_letters_set_updated_at'
  ) then
    create trigger master_cover_letters_set_updated_at
    before update on public.master_cover_letters
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.master_cover_letters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'master_cover_letters'
      and policyname = 'Users manage their own master cover letters'
  ) then
    create policy "Users manage their own master cover letters"
    on public.master_cover_letters for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('master-cover-letters', 'master-cover-letters', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users read their own master cover letter files'
  ) then
    create policy "Users read their own master cover letter files"
    on storage.objects for select
    using (bucket_id = 'master-cover-letters' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload their own master cover letter files'
  ) then
    create policy "Users upload their own master cover letter files"
    on storage.objects for insert
    with check (bucket_id = 'master-cover-letters' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end;
$$;
