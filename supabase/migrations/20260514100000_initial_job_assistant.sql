create extension if not exists "pgcrypto";

create type public.application_status as enum (
  'New',
  'Reviewed',
  'Ready',
  'Applied',
  'Interview',
  'Rejected'
);

create type public.job_source as enum (
  'Manual',
  'SEEK',
  'LinkedIn',
  'Adzuna',
  'Other'
);

create type public.generated_document_type as enum (
  'tailored_resume',
  'cover_letter'
);

create type public.generated_document_format as enum (
  'markdown',
  'docx',
  'pdf'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  linkedin_url text not null default '',
  target_job_titles text[] not null default '{}',
  preferred_industries text[] not null default '{}',
  salary_range text not null default '',
  preferred_locations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.master_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  storage_path text,
  resume_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.master_cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  storage_path text,
  cover_letter_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text not null,
  location text not null default '',
  salary text not null default '',
  job_url text not null default '',
  description text not null,
  source public.job_source not null default 'Manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status public.application_status not null default 'New',
  match_score integer check (match_score between 0 and 100),
  match_explanation text,
  missing_keywords text[] not null default '{}',
  tailored_resume text,
  cover_letter text,
  generated_by text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  document_type public.generated_document_type not null,
  format public.generated_document_format not null,
  generated_by text,
  content text,
  storage_path text,
  created_at timestamptz not null default now()
);

create index jobs_user_created_idx on public.jobs(user_id, created_at desc);
create index applications_user_created_idx on public.applications(user_id, created_at desc);
create index generated_documents_application_idx on public.generated_documents(application_id, document_type, format);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger master_resumes_set_updated_at
before update on public.master_resumes
for each row execute function public.set_updated_at();

create trigger master_cover_letters_set_updated_at
before update on public.master_cover_letters
for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.master_resumes enable row level security;
alter table public.master_cover_letters enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.generated_documents enable row level security;

create policy "Users manage their own profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users manage their own master resumes"
on public.master_resumes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their own master cover letters"
on public.master_cover_letters for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their own jobs"
on public.jobs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their own applications"
on public.applications for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their own generated documents"
on public.generated_documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('master-resumes', 'master-resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('master-cover-letters', 'master-cover-letters', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('generated-documents', 'generated-documents', false)
on conflict (id) do nothing;

create policy "Users read their own master resume files"
on storage.objects for select
using (bucket_id = 'master-resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload their own master resume files"
on storage.objects for insert
with check (bucket_id = 'master-resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read their own master cover letter files"
on storage.objects for select
using (bucket_id = 'master-cover-letters' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload their own master cover letter files"
on storage.objects for insert
with check (bucket_id = 'master-cover-letters' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read their own generated files"
on storage.objects for select
using (bucket_id = 'generated-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload their own generated files"
on storage.objects for insert
with check (bucket_id = 'generated-documents' and auth.uid()::text = (storage.foldername(name))[1]);
