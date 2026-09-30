-- ---------------------------------------------------------------------------
-- Multi-role support: a member keeps ONE primary `role` (unchanged) plus an
-- optional set of additional roles. This lets an owner grant, say, both a
-- "manager" (stock) and "accountant" hat to the same person without changing
-- the existing single-role RLS/permission model — the app treats the union of
-- {role} ∪ extra_roles as the user's effective roles for page access & nav.
--
-- Safe & additive: default empty array, so every existing member behaves
-- exactly as before until an owner assigns extra roles.
-- ---------------------------------------------------------------------------
alter table public.organization_members
  add column if not exists extra_roles public.user_role[] not null default '{}';

comment on column public.organization_members.extra_roles is
  'Additional roles beyond the primary `role`. Effective roles = role ∪ extra_roles.';
