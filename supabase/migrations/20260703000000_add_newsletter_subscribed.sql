ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean NOT NULL DEFAULT false;
