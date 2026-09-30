-- ---------------------------------------------------------------------------
-- Editable sidebar tagline / slogan per company. Shown under the company name
-- in the sidebar brand mark and on the POS top bar. Falls back to a default in
-- the UI when null, so existing companies keep the current look until they set
-- their own. Additive & migration-safe.
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists tagline text;

comment on column public.organizations.tagline is
  'Short slogan shown under the company name in the sidebar / POS brand mark.';
