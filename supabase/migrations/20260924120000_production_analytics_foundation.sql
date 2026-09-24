-- Apply before deploying analytics code. No auth/business triggers are installed.
-- Account discovery runs only in background; existing users are not emitted as signups.
-- These tables contain identifiers and fixed event metadata, never document/user content.
create table public.ga4_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  method text not null check (method in ('email', 'google')),
  environment text not null,
  identity jsonb not null default '{}',
  signup_source text not null default 'other',
  marketing_claimed boolean not null default false
);

create table public.ga4_outbox (
  event_key text primary key,
  event_name text not null check (event_name in ('sign_up','resume_uploaded','job_added','analysis_completed','document_generated','begin_checkout','purchase')),
  user_id uuid references auth.users(id) on delete cascade,
  params jsonb not null default '{}',
  identity jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','sending','sent','uncertain','rejected','excluded','expired')),
  attempted_at timestamptz
);
create index ga4_pending on public.ga4_outbox(occurred_at) where status = 'pending';

create table public.ga4_first_analysis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  event_key text not null
);
-- Existing successful generations must not become a new user's "first" analysis.
insert into public.ga4_first_analysis(user_id, event_key)
select distinct user_id, 'before_phase1' from public.generated_documents
where document_type = 'tailored_resume';

alter table public.ga4_accounts enable row level security;
alter table public.ga4_outbox enable row level security;
alter table public.ga4_first_analysis enable row level security;
revoke all on public.ga4_accounts, public.ga4_outbox, public.ga4_first_analysis from anon, authenticated;
grant all on public.ga4_accounts, public.ga4_outbox, public.ga4_first_analysis to service_role;

create function public.enqueue_ga4_event(p_key text, p_name text, p_user uuid, p_params jsonb, p_identity jsonb, p_occurred_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare first_key text;
begin
  if p_user is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  end if;
  if exists(select 1 from ga4_outbox where event_key = p_key) then return; end if;
  if p_name = 'analysis_completed' and p_user is not null then
    insert into ga4_first_analysis(user_id, event_key) values(p_user, p_key) on conflict do nothing;
    select event_key into first_key from ga4_first_analysis where user_id = p_user;
    p_params := p_params || jsonb_build_object('is_first_analysis', first_key = p_key);
  end if;
  insert into ga4_outbox(event_key,event_name,user_id,params,identity,occurred_at)
    values(p_key,p_name,p_user,p_params,clean_ga4_identity(p_identity),p_occurred_at) on conflict do nothing;
end $$;

-- Cutover is immutable; discovery never uses a login-age heuristic.
create table public.analytics_rollout (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default clock_timestamp()
);
insert into public.analytics_rollout(singleton) values(true);
alter table public.analytics_rollout enable row level security;
revoke all on public.analytics_rollout from public, anon, authenticated;
grant select on public.analytics_rollout to service_role;

create function public.clean_ga4_identity(v jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', case when v->>'client_id' ~ '^[0-9]+[.][0-9]+$' then v->>'client_id' end,
    'session_id', case when v->>'session_id' ~ '^[1-9][0-9]{0,14}$' then v->>'session_id' end,
    'captured_at', case when v->>'captured_at' ~ '^[1-9][0-9]{0,14}$' then (v->>'captured_at')::bigint end
  ));
$$;

alter table public.ga4_accounts add constraint ga4_accounts_identity_allowlist
  check (jsonb_typeof(identity) = 'object' and identity = clean_ga4_identity(identity));
alter table public.ga4_outbox add constraint ga4_outbox_identity_allowlist
  check (jsonb_typeof(identity) = 'object' and identity = clean_ga4_identity(identity));

-- Called after the response or by the scheduler, never by auth.users insertion.
create function public.discover_ga4_accounts(p_user uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare account record;
begin
  insert into ga4_accounts(user_id,created_at,method,environment,identity,signup_source)
  select u.id,u.created_at,
    case when u.raw_app_meta_data->>'provider' = 'google' then 'google' else 'email' end,
    case when u.raw_user_meta_data->'analytics'->>'environment' = 'production' then 'production'
         when u.raw_app_meta_data->>'provider' = 'google' then 'awaiting_callback' else 'excluded' end,
    clean_ga4_identity(u.raw_user_meta_data->'analytics'->'identity'),
    case when u.raw_user_meta_data->'analytics'->>'source' in ('claim_free_account','resume_tools')
         then u.raw_user_meta_data->'analytics'->>'source' else 'other' end
  from auth.users u cross join analytics_rollout r
  where u.created_at >= r.started_at and (p_user is null or u.id = p_user)
    and not exists(select 1 from ga4_accounts a where a.user_id=u.id)
  order by u.created_at limit 500 on conflict do nothing;
  for account in select a.* from ga4_accounts a where a.environment='production'
    and (p_user is null or a.user_id=p_user)
    and not exists(select 1 from ga4_outbox o where o.event_key='signup:' || a.user_id)
    order by a.created_at limit 500
  loop
    perform enqueue_ga4_event('signup:' || account.user_id,'sign_up',account.user_id,
      jsonb_build_object('method',account.method,'signup_source',account.signup_source),
      account.identity,account.created_at);
  end loop;
end $$;

-- Marketing has its own claim; GA ledger/outbox failures cannot suppress it.
create table public.marketing_signup_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.marketing_signup_claims enable row level security;
revoke all on public.marketing_signup_claims from public,anon,authenticated;
grant all on public.marketing_signup_claims to service_role;
create function public.claim_signup_marketing(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare claimed uuid;
begin
  insert into marketing_signup_claims(user_id)
  select u.id from auth.users u cross join analytics_rollout r
  where u.id=p_user and u.created_at>=r.started_at
    and (u.raw_user_meta_data->'analytics'->>'environment'='production'
      or u.raw_app_meta_data->>'provider'='google')
  on conflict do nothing returning user_id into claimed;
  return claimed is not null;
end $$;

-- Reconcile paid, fulfilled sessions after background enqueue failures.
create function public.ga4_purchase_candidates()
returns table(user_id uuid,stripe_payment_id text)
language sql security definer set search_path = public as $$
  select e.user_id,e.stripe_payment_id from entitlements e cross join analytics_rollout r
  where e.valid_from >= r.started_at and e.valid_from >= now()-interval '72 hours'
    and e.stripe_payment_id is not null
    and not exists(select 1 from ga4_outbox o where o.event_key='purchase:' || e.stripe_payment_id)
  order by e.valid_from limit 100;
$$;

-- Authenticated observation enriches the creation record; it cannot create one on login.
create function public.observe_ga4_signup(p_user uuid, p_identity jsonb, p_claim_marketing boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare account ga4_accounts%rowtype; claimed boolean;
begin
  perform discover_ga4_accounts(p_user);
  p_identity := clean_ga4_identity(p_identity);
  select * into account from ga4_accounts where user_id = p_user for update;
  if not found or account.environment = 'excluded' then return false; end if;
  if not (account.identity ? 'client_id') and p_identity ? 'client_id' then
    account.identity := p_identity;
  end if;
  claimed := p_claim_marketing and not account.marketing_claimed;
  update ga4_accounts set environment = 'production', identity = account.identity, marketing_claimed = marketing_claimed or p_claim_marketing where user_id = p_user;
  perform enqueue_ga4_event('signup:' || p_user, 'sign_up', p_user,
    jsonb_build_object('method',account.method,'signup_source',account.signup_source),account.identity,account.created_at);
  update ga4_outbox set identity = account.identity where event_key = 'signup:' || p_user
    and status = 'pending' and not (identity ? 'client_id');
  return claimed;
end $$;

revoke all on function public.enqueue_ga4_event(text,text,uuid,jsonb,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.observe_ga4_signup(uuid,jsonb,boolean) from public,anon,authenticated;

grant execute on function public.enqueue_ga4_event(text,text,uuid,jsonb,jsonb,timestamptz) to service_role;
grant execute on function public.observe_ga4_signup(uuid,jsonb,boolean) to service_role;

revoke all on function public.clean_ga4_identity(jsonb), public.discover_ga4_accounts(uuid), public.claim_signup_marketing(uuid), public.ga4_purchase_candidates() from public,anon,authenticated;
grant execute on function public.clean_ga4_identity(jsonb), public.discover_ga4_accounts(uuid), public.claim_signup_marketing(uuid), public.ga4_purchase_candidates() to service_role;
