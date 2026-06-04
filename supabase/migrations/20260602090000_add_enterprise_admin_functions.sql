alter table public.organizations
add column if not exists seat_limit integer not null default 50 check (seat_limit >= 0);

drop function if exists public.get_enterprise_admin_dashboard();
drop function if exists public.enterprise_grant_employee(uuid, text);

create or replace function public.get_enterprise_admin_dashboard()
returns table (
  organization_id uuid,
  organization_name text,
  organization_status public.organization_status,
  seat_limit integer,
  member_id uuid,
  user_id uuid,
  email text,
  role public.organization_member_role,
  member_created_at timestamptz,
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
    o.id as organization_id,
    o.name as organization_name,
    o.status as organization_status,
    o.seat_limit,
    om.id as member_id,
    om.user_id,
    au.email::text,
    om.role,
    om.created_at as member_created_at,
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
  order by o.name, om.created_at desc;
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

  select au.id
  into target_user_id
  from auth.users au
  where lower(au.email) = lower(trim(p_email))
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

create or replace function public.enterprise_revoke_employee(
  p_organization_id uuid,
  p_user_id uuid
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

  if exists (
    select 1
    from public.organization_members target_member
    where target_member.organization_id = p_organization_id
      and target_member.user_id = p_user_id
      and target_member.role = 'owner'
  ) then
    raise exception 'Owner access cannot be revoked from this dashboard.';
  end if;

  update public.entitlements
  set status = 'revoked',
      updated_at = now()
  where organization_id = p_organization_id
    and user_id = p_user_id
    and status = 'active';

  return true;
end;
$$;

revoke all on function public.get_enterprise_admin_dashboard() from public;
revoke all on function public.enterprise_revoke_employee(uuid, uuid) from public;
revoke all on function public.enterprise_grant_employee_access(uuid, text) from public;

grant execute on function public.get_enterprise_admin_dashboard() to authenticated;
grant execute on function public.enterprise_revoke_employee(uuid, uuid) to authenticated;
grant execute on function public.enterprise_grant_employee_access(uuid, text) to authenticated;
