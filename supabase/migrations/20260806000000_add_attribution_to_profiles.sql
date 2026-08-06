alter table public.profiles
  add column if not exists attr_source       text,
  add column if not exists attr_medium       text,
  add column if not exists attr_campaign     text,
  add column if not exists attr_content      text,
  add column if not exists attr_term         text,
  add column if not exists attr_referrer     text,
  add column if not exists attr_ga_client_id text,
  add column if not exists attr_fbp          text,
  add column if not exists attr_fbc          text,
  add column if not exists attr_landed_at    timestamptz;
