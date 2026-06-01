create type public.organization_status as enum (
  'active',
  'inactive'
);

create type public.organization_member_role as enum (
  'owner',
  'admin',
  'employee'
);

create type public.entitlement_plan_type as enum (
  'free',
  'sprint_7_day',
  'focus_30_day',
  'partner_90_day',
  'enterprise_90_day'
);

create type public.entitlement_status as enum (
  'active',
  'expired',
  'revoked'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.organization_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_member_role not null default 'employee',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  plan_type public.entitlement_plan_type not null,
  application_limit integer not null check (application_limit >= 0),
  applications_used integer not null default 0 check (applications_used >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  status public.entitlement_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (applications_used <= application_limit)
);

create index organizations_status_idx on public.organizations(status);
create index organization_members_user_idx on public.organization_members(user_id);
create index organization_members_org_role_idx on public.organization_members(organization_id, role);
create index entitlements_user_status_idx on public.entitlements(user_id, status, valid_until desc);
create index entitlements_org_idx on public.entitlements(organization_id);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.entitlements enable row level security;

create policy "Users read their own organization memberships"
on public.organization_members for select
using (auth.uid() = user_id);

create policy "Members read their organizations"
on public.organizations for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
  )
);

create policy "Users read their own entitlements"
on public.entitlements for select
using (auth.uid() = user_id);

create or replace function public.consume_application_credit(p_entitlement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.entitlements
  set applications_used = applications_used + 1,
      updated_at = now()
  where id = p_entitlement_id
    and user_id = auth.uid()
    and status = 'active'
    and valid_from <= now()
    and valid_until >= now()
    and applications_used < application_limit;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.consume_application_credit(uuid) from public;
grant execute on function public.consume_application_credit(uuid) to authenticated;
