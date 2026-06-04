drop function if exists public.enterprise_create_employee_invitation(uuid, text);

create or replace function public.enterprise_create_employee_invitation(
  p_organization_id uuid,
  p_email text
)
returns table (
  invitation_id uuid,
  organization_name text,
  email text,
  user_exists boolean
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
  target_already_allocated boolean;
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

  if target_user_id is not null and exists (
    select 1
    from public.organization_members target_member
    join public.entitlements ent
      on ent.organization_id = target_member.organization_id
     and ent.user_id = target_member.user_id
     and ent.plan_type = 'enterprise_90_day'
     and ent.status = 'active'
    where target_member.organization_id = p_organization_id
      and target_member.user_id = target_user_id
      and target_member.role = 'employee'
  ) then
    raise exception 'This employee already has active enterprise access.';
  end if;

  if target_user_id is not null and exists (
    select 1
    from public.organization_members target_member
    where target_member.organization_id = p_organization_id
      and target_member.user_id = target_user_id
      and target_member.role in ('owner', 'admin')
  ) then
    raise exception 'This user is already an organization admin.';
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
    select existing_invitation_id, o.name, normalized_email, (target_user_id is not null)
    from public.organizations o
    where o.id = p_organization_id;
    return;
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

  select count(*)
  into pending_invitation_seats
  from public.enterprise_invitations ei
  where ei.organization_id = p_organization_id
    and ei.status = 'pending';

  if organization_seat_limit > 0
     and not target_already_allocated
     and allocated_employee_seats + pending_invitation_seats >= organization_seat_limit then
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
  select existing_invitation_id, o.name, normalized_email, (target_user_id is not null)
  from public.organizations o
  where o.id = p_organization_id;
end;
$$;

revoke all on function public.enterprise_create_employee_invitation(uuid, text) from public;
grant execute on function public.enterprise_create_employee_invitation(uuid, text) to authenticated;
