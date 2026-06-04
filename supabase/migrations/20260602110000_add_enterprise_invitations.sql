create type public.enterprise_invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create table public.enterprise_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_member_role not null default 'employee',
  status public.enterprise_invitation_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role = 'employee')
);

create index enterprise_invitations_org_status_idx
on public.enterprise_invitations(organization_id, status, created_at desc);

create index enterprise_invitations_email_idx
on public.enterprise_invitations(lower(email));

create unique index enterprise_invitations_pending_unique_idx
on public.enterprise_invitations(organization_id, lower(email))
where status = 'pending';

create trigger enterprise_invitations_set_updated_at
before update on public.enterprise_invitations
for each row execute function public.set_updated_at();

alter table public.enterprise_invitations enable row level security;

drop function if exists public.get_enterprise_admin_dashboard();

create or replace function public.get_enterprise_admin_dashboard()
returns table (
  row_type text,
  organization_id uuid,
  organization_name text,
  organization_status public.organization_status,
  seat_limit integer,
  member_id uuid,
  invitation_id uuid,
  user_id uuid,
  email text,
  role public.organization_member_role,
  member_created_at timestamptz,
  invitation_status public.enterprise_invitation_status,
  invitation_expires_at timestamptz,
  entitlement_id uuid,
  plan_type public.entitlement_plan_type,
  application_limit integer,
  applications_used integer,
  valid_from timestamptz,
  valid_until timestamptz,
  entitlement_status public.entitlement_status
)
language sql
security definer
set search_path = public, auth
as $$
  select
    'member'::text as row_type,
    o.id as organization_id,
    o.name as organization_name,
    o.status as organization_status,
    o.seat_limit,
    om.id as member_id,
    null::uuid as invitation_id,
    om.user_id,
    au.email::text,
    om.role,
    om.created_at as member_created_at,
    null::public.enterprise_invitation_status as invitation_status,
    null::timestamptz as invitation_expires_at,
    e.id as entitlement_id,
    e.plan_type,
    e.application_limit,
    e.applications_used,
    e.valid_from,
    e.valid_until,
    e.status as entitlement_status
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  join auth.users au on au.id = om.user_id
  left join lateral (
    select *
    from public.entitlements ent
    where ent.organization_id = om.organization_id
      and ent.user_id = om.user_id
      and ent.plan_type = 'enterprise_90_day'
    order by (ent.status = 'active') desc, ent.valid_until desc
    limit 1
  ) e on true
  where exists (
    select 1
    from public.organization_members admin_member
    where admin_member.organization_id = om.organization_id
      and admin_member.user_id = auth.uid()
      and admin_member.role in ('owner', 'admin')
  )

  union all

  select
    'invitation'::text as row_type,
    o.id as organization_id,
    o.name as organization_name,
    o.status as organization_status,
    o.seat_limit,
    null::uuid as member_id,
    ei.id as invitation_id,
    null::uuid as user_id,
    ei.email,
    ei.role,
    ei.created_at as member_created_at,
    ei.status as invitation_status,
    ei.expires_at as invitation_expires_at,
    null::uuid as entitlement_id,
    null::public.entitlement_plan_type as plan_type,
    null::integer as application_limit,
    null::integer as applications_used,
    null::timestamptz as valid_from,
    null::timestamptz as valid_until,
    null::public.entitlement_status as entitlement_status
  from public.enterprise_invitations ei
  join public.organizations o on o.id = ei.organization_id
  where ei.status = 'pending'
    and exists (
      select 1
      from public.organization_members admin_member
      where admin_member.organization_id = ei.organization_id
        and admin_member.user_id = auth.uid()
        and admin_member.role in ('owner', 'admin')
    )
  order by organization_name, member_created_at desc;
$$;

create or replace function public.enterprise_create_employee_invitation(
  p_organization_id uuid,
  p_email text
)
returns table (
  invitation_id uuid,
  organization_name text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
  target_user_id uuid;
  allocated_employee_seats integer;
  pending_invitation_seats integer;
  organization_seat_limit integer;
  existing_invitation_id uuid;
begin
  normalized_email := lower(trim(p_email));

  if not exists (
    select 1
    from public.organization_members admin_member
    where admin_member.organization_id = p_organization_id
      and admin_member.user_id = auth.uid()
      and admin_member.role in ('owner', 'admin')
  ) then
    raise exception 'You do not have permission to manage this organization.';
  end if;

  select au.id
  into target_user_id
  from auth.users au
  where lower(au.email) = normalized_email
  limit 1;

  if target_user_id is not null then
    raise exception 'This email already belongs to an ApplyHQ user. Add employee access instead.';
  end if;

  select ei.id
  into existing_invitation_id
  from public.enterprise_invitations ei
  where ei.organization_id = p_organization_id
    and lower(ei.email) = normalized_email
    and ei.status = 'pending'
  limit 1;

  if existing_invitation_id is not null then
    return query
    select existing_invitation_id, o.name, normalized_email
    from public.organizations o
    where o.id = p_organization_id;
    return;
  end if;

  select o.seat_limit
  into organization_seat_limit
  from public.organizations o
  where o.id = p_organization_id;

  select count(distinct employee_member.user_id)
  into allocated_employee_seats
  from public.organization_members employee_member
  join public.entitlements ent
    on ent.organization_id = employee_member.organization_id
   and ent.user_id = employee_member.user_id
   and ent.plan_type = 'enterprise_90_day'
  where employee_member.organization_id = p_organization_id
    and employee_member.role = 'employee';

  select count(*)
  into pending_invitation_seats
  from public.enterprise_invitations ei
  where ei.organization_id = p_organization_id
    and ei.status = 'pending';

  if organization_seat_limit > 0 and allocated_employee_seats + pending_invitation_seats >= organization_seat_limit then
    raise exception 'This organization has used all available employee seats.';
  end if;

  insert into public.enterprise_invitations (
    organization_id,
    email,
    role,
    invited_by
  )
  values (
    p_organization_id,
    normalized_email,
    'employee',
    auth.uid()
  )
  returning id into existing_invitation_id;

  return query
  select existing_invitation_id, o.name, normalized_email
  from public.organizations o
  where o.id = p_organization_id;
end;
$$;

create or replace function public.enterprise_grant_employee_access(
  p_organization_id uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  allocated_employee_seats integer;
  organization_seat_limit integer;
  target_already_allocated boolean;
  normalized_email text;
begin
  normalized_email := lower(trim(p_email));

  if not exists (
    select 1
    from public.organization_members admin_member
    where admin_member.organization_id = p_organization_id
      and admin_member.user_id = auth.uid()
      and admin_member.role in ('owner', 'admin')
  ) then
    raise exception 'You do not have permission to manage this organization.';
  end if;

  if exists (
    select 1
    from public.enterprise_invitations ei
    where ei.organization_id = p_organization_id
      and lower(ei.email) = normalized_email
      and ei.status = 'pending'
  ) then
    raise exception 'An enterprise invite is already pending for this email address.';
  end if;

  select au.id
  into target_user_id
  from auth.users au
  where lower(au.email) = normalized_email
  limit 1;

  if target_user_id is null then
    raise exception 'No ApplyHQ user was found for this email address.';
  end if;

  select o.seat_limit
  into organization_seat_limit
  from public.organizations o
  where o.id = p_organization_id;

  select exists (
    select 1
    from public.organization_members employee_member
    join public.entitlements ent
      on ent.organization_id = employee_member.organization_id
     and ent.user_id = employee_member.user_id
     and ent.plan_type = 'enterprise_90_day'
    where employee_member.organization_id = p_organization_id
      and employee_member.user_id = target_user_id
      and employee_member.role = 'employee'
  )
  into target_already_allocated;

  select count(distinct employee_member.user_id)
  into allocated_employee_seats
  from public.organization_members employee_member
  join public.entitlements ent
    on ent.organization_id = employee_member.organization_id
   and ent.user_id = employee_member.user_id
   and ent.plan_type = 'enterprise_90_day'
  where employee_member.organization_id = p_organization_id
    and employee_member.role = 'employee';

  if organization_seat_limit > 0 and not target_already_allocated and allocated_employee_seats >= organization_seat_limit then
    raise exception 'This organization has used all available employee seats.';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (p_organization_id, target_user_id, 'employee')
  on conflict (organization_id, user_id) do nothing;

  update public.entitlements ent
  set status = 'revoked',
      updated_at = now()
  where ent.organization_id = p_organization_id
    and ent.user_id = target_user_id
    and ent.status = 'active';

  insert into public.entitlements (
    user_id,
    organization_id,
    plan_type,
    application_limit,
    applications_used,
    valid_from,
    valid_until,
    status
  )
  values (
    target_user_id,
    p_organization_id,
    'enterprise_90_day',
    150,
    0,
    now(),
    now() + interval '90 days',
    'active'
  );

  return true;
end;
$$;

create or replace function public.enterprise_revoke_invitation(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organization_members admin_member
    where admin_member.organization_id = p_organization_id
      and admin_member.user_id = auth.uid()
      and admin_member.role in ('owner', 'admin')
  ) then
    raise exception 'You do not have permission to manage this organization.';
  end if;

  update public.enterprise_invitations
  set status = 'revoked',
      updated_at = now()
  where id = p_invitation_id
    and organization_id = p_organization_id
    and status = 'pending';

  return true;
end;
$$;

create or replace function public.accept_enterprise_invitations()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_email text;
  invite_record record;
begin
  select lower(au.email)
  into current_email
  from auth.users au
  where au.id = auth.uid();

  if current_email is null then
    return false;
  end if;

  for invite_record in
    select *
    from public.enterprise_invitations ei
    where lower(ei.email) = current_email
      and ei.status = 'pending'
      and ei.expires_at >= now()
  loop
    insert into public.organization_members (organization_id, user_id, role)
    values (invite_record.organization_id, auth.uid(), 'employee')
    on conflict (organization_id, user_id) do nothing;

    update public.entitlements ent
    set status = 'revoked',
        updated_at = now()
    where ent.organization_id = invite_record.organization_id
      and ent.user_id = auth.uid()
      and ent.status = 'active';

    insert into public.entitlements (
      user_id,
      organization_id,
      plan_type,
      application_limit,
      applications_used,
      valid_from,
      valid_until,
      status
    )
    values (
      auth.uid(),
      invite_record.organization_id,
      'enterprise_90_day',
      150,
      0,
      now(),
      now() + interval '90 days',
      'active'
    );

    update public.enterprise_invitations
    set status = 'accepted',
        accepted_by = auth.uid(),
        accepted_at = now(),
        updated_at = now()
    where id = invite_record.id;
  end loop;

  update public.enterprise_invitations
  set status = 'expired',
      updated_at = now()
  where lower(email) = current_email
    and status = 'pending'
    and expires_at < now();

  return true;
end;
$$;

revoke all on function public.get_enterprise_admin_dashboard() from public;
revoke all on function public.enterprise_grant_employee_access(uuid, text) from public;
revoke all on function public.enterprise_create_employee_invitation(uuid, text) from public;
revoke all on function public.enterprise_revoke_invitation(uuid, uuid) from public;
revoke all on function public.accept_enterprise_invitations() from public;

grant execute on function public.get_enterprise_admin_dashboard() to authenticated;
grant execute on function public.enterprise_grant_employee_access(uuid, text) to authenticated;
grant execute on function public.enterprise_create_employee_invitation(uuid, text) to authenticated;
grant execute on function public.enterprise_revoke_invitation(uuid, uuid) to authenticated;
grant execute on function public.accept_enterprise_invitations() to authenticated;
