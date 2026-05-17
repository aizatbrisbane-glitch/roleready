alter table public.applications
add column if not exists generated_by text,
add column if not exists generated_at timestamptz;

alter table public.generated_documents
add column if not exists generated_by text;
