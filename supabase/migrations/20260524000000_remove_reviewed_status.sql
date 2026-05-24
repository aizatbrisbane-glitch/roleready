-- Migrate any existing 'Reviewed' applications to 'New' before removing the enum value
UPDATE public.applications SET status = 'New' WHERE status = 'Reviewed';

-- PostgreSQL doesn't support dropping enum values directly — recreate the type
CREATE TYPE public.application_status_new AS ENUM ('New', 'Ready', 'Applied', 'Interview', 'Rejected');

ALTER TABLE public.applications
  ALTER COLUMN status TYPE public.application_status_new
  USING status::text::public.application_status_new;

DROP TYPE public.application_status;
ALTER TYPE public.application_status_new RENAME TO application_status;
