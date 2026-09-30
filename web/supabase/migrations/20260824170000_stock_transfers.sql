-- ============================================================================
-- Multi-Branch — Phase 3b: inter-branch stock transfer workflow
--
-- A stock_transfers header records a requested move of a product between two
-- warehouses (and therefore two branches). It goes pending → completed, and
-- ONLY on completion is stock actually moved — through the normal inventory_
-- levels + stock_movements path (never by editing quantities directly). The two
-- resulting movements are tagged with the source and destination branch.
-- ============================================================================

do $$ begin
  create type public.transfer_status as enum ('pending', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  transfer_number text not null,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 0,
  source_warehouse_id uuid references public.warehouses (id) on delete set null,
  dest_warehouse_id uuid references public.warehouses (id) on delete set null,
  source_branch_id uuid references public.branches (id) on delete set null,
  dest_branch_id uuid references public.branches (id) on delete set null,
  status public.transfer_status not null default 'pending',
  notes text,
  requested_by uuid references auth.users (id),
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, transfer_number)
);
create index if not exists stock_transfers_org_idx on public.stock_transfers (organization_id, created_at desc);

alter table public.stock_transfers enable row level security;

-- Managers+ may manage transfers touching a branch they can access (either the
-- source or the destination). Owner/admin/accountant are org-wide via the helper.
do $$ begin
  drop policy if exists "transfers manage" on public.stock_transfers;
  create policy "transfers manage" on public.stock_transfers for all
    using (
      public.org_role(organization_id) in ('owner', 'admin', 'manager')
      and (
        public.can_access_branch(organization_id, source_branch_id)
        or public.can_access_branch(organization_id, dest_branch_id)
      )
    )
    with check (
      public.org_role(organization_id) in ('owner', 'admin', 'manager')
      and (
        public.can_access_branch(organization_id, source_branch_id)
        or public.can_access_branch(organization_id, dest_branch_id)
      )
    );
end $$;
