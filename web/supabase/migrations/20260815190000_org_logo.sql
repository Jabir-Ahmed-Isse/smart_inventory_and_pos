-- ============================================================================
-- Per-company branding — store each organization's own logo.
-- Small resized data-URL kept in a text column (same approach as product images),
-- so no Supabase Storage bucket is required. RLS on organizations already scopes
-- updates to the org's own admins/owner.
-- ============================================================================
alter table public.organizations add column if not exists logo_url text;
