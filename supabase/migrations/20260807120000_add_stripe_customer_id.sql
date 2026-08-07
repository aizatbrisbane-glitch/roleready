alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists idx_profiles_stripe_customer_id
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;
