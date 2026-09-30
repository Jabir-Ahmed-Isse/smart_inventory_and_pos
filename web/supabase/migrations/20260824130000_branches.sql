-- ============================================================================
-- Multi-Branch — Phase 1: Foundation
--
-- A branch is a business location INSIDE an organization (never a separate
-- tenant). This migration only creates the branch tables, the assignment table,
-- and the access helpers. It does NOT yet add branch_id to operational tables or
-- change any existing RLS — so every existing organization keeps working exactly
-- as before. Enforcement is wired on in a later phase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- branches — one row per business location, scoped to an organization
-- ---------------------------------------------------------------------------
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  phone text,
  email text,
  address text,
  city text,
  manager_id uuid references public.employees (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Branch code is unique WITHIN an organization (not globally).
  unique (organization_id, code)
);
create index if not exists branches_org_idx on public.branches (organization_id);

drop trigger if exists set_branches_updated_at on public.branches;
create trigger set_branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- branch_members — which branches a user may access (many-to-many).
-- Owner/admin are NOT required to have rows here: they get org-wide scope from
-- the helpers below. Other roles are limited to the branches listed here.
-- ---------------------------------------------------------------------------
create table if not exists public.branch_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);
create index if not exists branch_members_org_idx on public.branch_members (organization_id);
create index if not exists branch_members_branch_idx on public.branch_members (branch_id);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER, mirror is_org_member/org_role).
-- Defined now so the app and later-phase RLS can rely on them. Owner/admin get
-- EVERY active branch in the org; everyone else gets only their assigned rows.
-- ---------------------------------------------------------------------------
create or replace function public.user_branch_ids(org uuid)
returns uuid[] language sql security definer stable set search_path = public as $$
  select case
    when public.org_role(org) in ('owner', 'admin') then
      coalesce((select array_agg(id) from public.branches where organization_id = org), '{}')
    else
      coalesce((select array_agg(bm.branch_id) from public.branch_members bm
                where bm.organization_id = org and bm.user_id = auth.uid()), '{}')
  end;
$$;

-- True if the caller may access rows tagged with this branch. A NULL branch is
-- company-level and visible to any org member with org-wide scope.
create or replace function public.can_access_branch(org uuid, branch uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    public.is_org_member(org)
    and (
      public.org_role(org) in ('owner', 'admin')
      or branch is null
      or branch = any (public.user_branch_ids(org))
    );
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
--   branches       : any member reads; owner/admin manage.
--   branch_members : any member reads (needed to resolve their own access);
--                    owner/admin manage assignments.
-- ---------------------------------------------------------------------------
alter table public.branches       enable row level security;
alter table public.branch_members enable row level security;

do $$ begin
  drop policy if exists "branches read" on public.branches;
  create policy "branches read" on public.branches for select
    using (public.is_org_member(organization_id));
  drop policy if exists "branches manage" on public.branches;
  create policy "branches manage" on public.branches for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

  drop policy if exists "branch_members read" on public.branch_members;
  create policy "branch_members read" on public.branch_members for select
    using (public.is_org_member(organization_id));
  drop policy if exists "branch_members manage" on public.branch_members;
  create policy "branch_members manage" on public.branch_members for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));
end $$;
