-- Events table for Koalapply Mission Control dashboard
CREATE TABLE IF NOT EXISTS public.koalapply_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_koalapply_events_created_at  ON public.koalapply_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_koalapply_events_event_type  ON public.koalapply_events(event_type);
CREATE INDEX IF NOT EXISTS idx_koalapply_events_user_id     ON public.koalapply_events(user_id);

-- Enable Row Level Security
ALTER TABLE public.koalapply_events ENABLE ROW LEVEL SECURITY;

-- SELECT: only admin and founder roles may read (applies to both queries and realtime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'koalapply_events'
      AND policyname = 'admin_founder_can_read_events'
  ) THEN
    CREATE POLICY "admin_founder_can_read_events"
      ON public.koalapply_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
      );
  END IF;
END $$;

-- No INSERT policy for client roles; all inserts go through the service role
-- (service role bypasses RLS by default in Supabase)

-- Enable realtime for this table
-- Run this block manually in the Supabase SQL editor if the migration runner
-- does not have superuser privileges, or toggle the table in the Supabase
-- dashboard under Database > Replication > supabase_realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'koalapply_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.koalapply_events;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Publication may not exist in all environments; skip silently
    NULL;
END $$;

-- Trigger: auto-log USER_SIGNUP when a new profile is created
CREATE OR REPLACE FUNCTION public.log_user_signup_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.koalapply_events (event_type, user_id, metadata)
  VALUES (
    'USER_SIGNUP',
    NEW.id,
    jsonb_build_object(
      'first_name', NULLIF(split_part(COALESCE(NEW.name, ''), ' ', 1), '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_user_signup ON public.profiles;
CREATE TRIGGER trg_log_user_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_signup_event();
