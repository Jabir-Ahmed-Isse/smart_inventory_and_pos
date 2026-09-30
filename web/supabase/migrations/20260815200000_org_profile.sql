-- ============================================================================
-- Company profile — the full org info an enterprise expects to manage:
-- legal identity, contact, registered address, tax/registration IDs, industry.
-- (name, slug, currency, timezone, tax_rate, logo_url already exist.)
-- All additive text columns on organizations; RLS already restricts updates to
-- the org's own owner/admin.
-- ============================================================================
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists legal_name text;
alter table public.organizations add column if not exists industry text;
alter table public.organizations add column if not exists email text;
alter table public.organizations add column if not exists phone text;
alter table public.organizations add column if not exists website text;
alter table public.organizations add column if not exists tax_id text;
alter table public.organizations add column if not exists registration_number text;
alter table public.organizations add column if not exists address_line1 text;
alter table public.organizations add column if not exists address_line2 text;
alter table public.organizations add column if not exists city text;
alter table public.organizations add column if not exists state_region text;
alter table public.organizations add column if not exists postal_code text;
alter table public.organizations add column if not exists country text;
