-- Create app_role enum idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'founder');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
