-- Single source of truth for plan application limits and durations.
-- Edit only this function to change what any plan grants.
create or replace function public.get_plan_defaults(
  p_plan_type public.entitlement_plan_type,
  out application_limit integer,
  out valid_days integer
)
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  case p_plan_type
    when 'free'              then application_limit := 3;   valid_days := 30;
    when 'sprint_7_day'      then application_limit := 12;  valid_days := 7;
    when 'focus_30_day'      then application_limit := 50;  valid_days := 30;
    when 'partner_90_day'    then application_limit := 150; valid_days := 90;
    when 'enterprise_90_day' then application_limit := 150; valid_days := 90;
    else raise exception 'Unknown plan type: %', p_plan_type;
  end case;
end;
$$;

revoke all on function public.get_plan_defaults(public.entitlement_plan_type) from public;
grant execute on function public.get_plan_defaults(public.entitlement_plan_type) to service_role;

-- admin_grant_user_plan: replace hardcoded CASE blocks with get_plan_defaults.
create or replace function public.admin_grant_user_plan(
  p_email text,
  p_plan_type public.entitlement_plan_type,
  p_organization_id uuid default null,
  p_application_limit integer default null,
  p_valid_days integer default null
)
returns public.entitlements
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  defaults record;
  resolved_application_limit integer;
  resolved_valid_days integer;
  new_entitlement public.entitlements;
begin
  select au.id into target_user_id
  from auth.users au
  where lower(au.email) = lower(trim(p_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No ApplyHQ user was found for this email address.';
  end if;

  select * into defaults from public.get_plan_defaults(p_plan_type);
  resolved_application_limit := coalesce(p_application_limit, defaults.application_limit);
  resolved_valid_days        := coalesce(p_valid_days,        defaults.valid_days);

  if resolved_application_limit < 0 then
    raise exception 'Application limit must be zero or greater.';
  end if;
  if resolved_valid_days < 1 then
    raise exception 'Validity must be at least one day.';
  end if;

  update public.entitlements
  set status = 'revoked', updated_at = now()
  where user_id = target_user_id and status = 'active';

  insert into public.entitlements (
    user_id, organization_id, plan_type,
    application_limit, applications_used, valid_from, valid_until, status
  )
  values (
    target_user_id, p_organization_id, p_plan_type,
    resolved_application_limit, 0, now(),
    now() + make_interval(days => resolved_valid_days),
    'active'
  )
  returning * into new_entitlement;

  return new_entitlement;
end;
$$;

revoke all on function public.admin_grant_user_plan(text, public.entitlement_plan_type, uuid, integer, integer) from public;
grant execute on function public.admin_grant_user_plan(text, public.entitlement_plan_type, uuid, integer, integer) to service_role;

-- enterprise_grant_employee_access: replace hardcoded 150 / '90 days' with get_plan_defaults.
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
  normalized_email text;
  target_user_id uuid;
  allocated_employee_seats integer;
  organization_seat_limit integer;
  target_already_allocated boolean;
  defaults record;
begin
  normalized_email := lower(trim(p_email));

  if not exists (
    select 1 from public.organization_members admin_member
    where admin_member.organization_id = p_organization_id
      and admin_member.user_id = auth.uid()
      and admin_member.role in ('owner', 'admin')
  ) then
    raise exception 'You do not have permission to manage this organization.';
  end if;

  select au.id into target_user_id
  from auth.users au
  where lower(au.email) = normalized_email
  limit 1;

  if target_user_id is null then
    raise exception 'No ApplyHQ user was found for this email address.';
  end if;

  select o.seat_limit into organization_seat_limit
  from public.organizations o where o.id = p_organization_id;

  select exists (
    select 1 from public.organization_members em
    join public.entitlements ent
      on ent.organization_id = em.organization_id
     and ent.user_id = em.user_id
     and ent.plan_type = 'enterprise_90_day'
    where em.organization_id = p_organization_id
      and em.user_id = target_user_id
      and em.role = 'employee'
  ) into target_already_allocated;

  select count(distinct em.user_id) into allocated_employee_seats
  from public.organization_members em
  join public.entitlements ent
    on ent.organization_id = em.organization_id
   and ent.user_id = em.user_id
   and ent.plan_type = 'enterprise_90_day'
  where em.organization_id = p_organization_id
    and em.role = 'employee';

  if organization_seat_limit > 0 and not target_already_allocated
     and allocated_employee_seats >= organization_seat_limit then
    raise exception 'This organization has used all available employee seats.';
  end if;

  select * into defaults from public.get_plan_defaults('enterprise_90_day');

  insert into public.organization_members (organization_id, user_id, role)
  values (p_organization_id, target_user_id, 'employee')
  on conflict (organization_id, user_id) do nothing;

  update public.entitlements ent
  set status = 'revoked', updated_at = now()
  where ent.organization_id = p_organization_id
    and ent.user_id = target_user_id
    and ent.status = 'active';

  insert into public.entitlements (
    user_id, organization_id, plan_type,
    application_limit, applications_used, valid_from, valid_until, status
  )
  values (
    target_user_id, p_organization_id, 'enterprise_90_day',
    defaults.application_limit, 0, now(),
    now() + make_interval(days => defaults.valid_days),
    'active'
  );

  return true;
end;
$$;

-- accept_enterprise_invitations: replace hardcoded 150 / '90 days' with get_plan_defaults.
create or replace function public.accept_enterprise_invitations()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_email text;
  invite_record record;
  defaults record;
begin
  select lower(au.email) into current_email
  from auth.users au where au.id = auth.uid();

  if current_email is null then return false; end if;

  select * into defaults from public.get_plan_defaults('enterprise_90_day');

  for invite_record in
    select * from public.enterprise_invitations ei
    where lower(ei.email) = current_email
      and ei.status = 'pending'
      and ei.expires_at >= now()
  loop
    insert into public.organization_members (organization_id, user_id, role)
    values (invite_record.organization_id, auth.uid(), 'employee')
    on conflict (organization_id, user_id) do nothing;

    update public.entitlements ent
    set status = 'revoked', updated_at = now()
    where ent.organization_id = invite_record.organization_id
      and ent.user_id = auth.uid()
      and ent.status = 'active';

    insert into public.entitlements (
      user_id, organization_id, plan_type,
      application_limit, applications_used, valid_from, valid_until, status
    )
    values (
      auth.uid(), invite_record.organization_id, 'enterprise_90_day',
      defaults.application_limit, 0, now(),
      now() + make_interval(days => defaults.valid_days),
      'active'
    );

    update public.enterprise_invitations
    set status = 'accepted', accepted_by = auth.uid(),
        accepted_at = now(), updated_at = now()
    where id = invite_record.id;
  end loop;

  update public.enterprise_invitations
  set status = 'expired', updated_at = now()
  where lower(email) = current_email
    and status = 'pending'
    and expires_at < now();

  return true;
end;
$$;

revoke all on function public.enterprise_grant_employee_access(uuid, text) from public;
revoke all on function public.accept_enterprise_invitations() from public;
grant execute on function public.enterprise_grant_employee_access(uuid, text) to authenticated;
grant execute on function public.accept_enterprise_invitations() to authenticated;
