alter table public.entitlements
  add column if not exists stripe_payment_id text unique;

comment on column public.entitlements.stripe_payment_id is
  'Stripe Checkout Session ID (cs_...). Prevents duplicate entitlement grants on webhook retry.';

create index if not exists entitlements_stripe_payment_id_idx
  on public.entitlements (stripe_payment_id)
  where stripe_payment_id is not null;
