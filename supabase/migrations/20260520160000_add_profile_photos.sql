alter table public.profiles
add column if not exists avatar_url text not null default '',
add column if not exists avatar_storage_path text not null default '';

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read profile images'
  ) then
    create policy "Public can read profile images"
    on storage.objects for select
    using (bucket_id = 'profile-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload their own profile images'
  ) then
    create policy "Users upload their own profile images"
    on storage.objects for insert
    with check (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users update their own profile images'
  ) then
    create policy "Users update their own profile images"
    on storage.objects for update
    using (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1])
    with check (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end;
$$;
