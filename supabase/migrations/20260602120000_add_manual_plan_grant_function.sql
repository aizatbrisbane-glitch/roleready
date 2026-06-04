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
  resolved_application_limit integer;
  resolved_valid_days integer;
  new_entitlement public.entitlements;
begin
  select au.id
  into target_user_id
  from auth.users au
  where lower(au.email) = lower(trim(p_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No ApplyHQ user was found for this email address.';
  end if;

  resolved_application_limit := coalesce(
    p_application_limit,
    case p_plan_type
      when 'free' then 3
      when 'sprint_7_day' then 12
      when 'focus_30_day' then 50
      when 'partner_90_day' then 150
      when 'enterprise_90_day' then 150
    end
  );

  resolved_valid_days := coalesce(
    p_valid_days,
    case p_plan_type
      when 'free' then 30
      when 'sprint_7_day' then 7
      when 'focus_30_day' then 30
      when 'partner_90_day' then 90
      when 'enterprise_90_day' then 90
    end
  );

  if resolved_application_limit < 0 then
    raise exception 'Application limit must be zero or greater.';
  end if;

  if resolved_valid_days < 1 then
    raise exception 'Validity must be at least one day.';
  end if;

  update public.entitlements
  set status = 'revoked',
      updated_at = now()
  where user_id = target_user_id
    and status = 'active';

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
    p_plan_type,
    resolved_application_limit,
    0,
    now(),
    now() + make_interval(days => resolved_valid_days),
    'active'
  )
  returning * into new_entitlement;

  return new_entitlement;
end;
$$;

revoke all on function public.admin_grant_user_plan(text, public.entitlement_plan_type, uuid, integer, integer) from public;
grant execute on function public.admin_grant_user_plan(text, public.entitlement_plan_type, uuid, integer, integer) to service_role;
