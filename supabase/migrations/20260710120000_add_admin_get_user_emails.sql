-- Helper function for the Mission Control dashboard.
-- Runs as postgres (SECURITY DEFINER) so it can read auth.users.
-- Only callable via the service role (admin client).
CREATE OR REPLACE FUNCTION public.admin_get_user_emails()
RETURNS TABLE(id uuid, email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id, COALESCE(email, '') AS email, created_at FROM auth.users;
$$;

-- Revoke from public; only the service role should call this
REVOKE ALL ON FUNCTION public.admin_get_user_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_emails() TO service_role;
