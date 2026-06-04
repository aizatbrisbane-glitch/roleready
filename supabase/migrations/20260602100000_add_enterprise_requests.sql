create type public.enterprise_request_status as enum (
  'new',
  'contacted',
  'approved',
  'rejected'
);

create table public.enterprise_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_role text,
  requested_seats integer not null check (requested_seats > 0),
  expected_start_timeframe text,
  notes text,
  status public.enterprise_request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index enterprise_requests_status_created_idx
on public.enterprise_requests(status, created_at desc);

create index enterprise_requests_contact_email_idx
on public.enterprise_requests (lower(contact_email));

create trigger enterprise_requests_set_updated_at
before update on public.enterprise_requests
for each row execute function public.set_updated_at();

alter table public.enterprise_requests enable row level security;

create or replace function public.submit_enterprise_request(
  p_company_name text,
  p_contact_name text,
  p_contact_email text,
  p_contact_role text,
  p_requested_seats integer,
  p_expected_start_timeframe text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  normalized_email text;
begin
  normalized_email := lower(trim(p_contact_email));

  if exists (
    select 1
    from public.enterprise_requests er
    where lower(er.contact_email) = normalized_email
      and er.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Please wait before submitting another enterprise request.';
  end if;

  insert into public.enterprise_requests (
    company_name,
    contact_name,
    contact_email,
    contact_role,
    requested_seats,
    expected_start_timeframe,
    notes
  )
  values (
    trim(p_company_name),
    trim(p_contact_name),
    normalized_email,
    nullif(trim(p_contact_role), ''),
    p_requested_seats,
    nullif(trim(p_expected_start_timeframe), ''),
    nullif(trim(p_notes), '')
  )
  returning id into request_id;

  return request_id;
end;
$$;

revoke all on function public.submit_enterprise_request(text, text, text, text, integer, text, text) from public;
grant execute on function public.submit_enterprise_request(text, text, text, text, integer, text, text) to anon;
grant execute on function public.submit_enterprise_request(text, text, text, text, integer, text, text) to authenticated;
