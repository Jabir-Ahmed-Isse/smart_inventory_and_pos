-- ============================================================================
-- Multi-Branch — Phase 2a: branch_id columns (additive, nullable, permissive)
--
-- Adds a nullable branch_id to the branch-owned operational tables. Nothing is
-- made NOT NULL and no RLS is changed yet, so every existing row/flow keeps
-- working (branch_id simply stays NULL until backfilled / stamped). A NULL
-- branch means "company-level".
-- ============================================================================

alter table public.warehouses      add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.sales_orders    add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.purchase_orders add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.stock_movements add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.expenses        add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.transactions    add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.employees       add column if not exists branch_id uuid references public.branches (id) on delete set null;
alter table public.journal_entries add column if not exists branch_id uuid references public.branches (id) on delete set null;

create index if not exists warehouses_branch_idx      on public.warehouses (branch_id);
create index if not exists sales_orders_branch_idx    on public.sales_orders (organization_id, branch_id);
create index if not exists purchase_orders_branch_idx on public.purchase_orders (organization_id, branch_id);
create index if not exists stock_movements_branch_idx on public.stock_movements (organization_id, branch_id);
create index if not exists expenses_branch_idx        on public.expenses (organization_id, branch_id);
create index if not exists transactions_branch_idx    on public.transactions (organization_id, branch_id);
create index if not exists employees_branch_idx       on public.employees (branch_id);
create index if not exists journal_entries_branch_idx on public.journal_entries (organization_id, branch_id);

-- ---------------------------------------------------------------------------
-- Accountant now has org-wide branch scope (finance spans the whole company).
-- Redefine the helpers to treat owner/admin/accountant as org-wide.
-- ---------------------------------------------------------------------------
create or replace function public.user_branch_ids(org uuid)
returns uuid[] language sql security definer stable set search_path = public as $$
  select case
    when public.org_role(org) in ('owner', 'admin', 'accountant') then
      coalesce((select array_agg(id) from public.branches where organization_id = org), '{}')
    else
      coalesce((select array_agg(bm.branch_id) from public.branch_members bm
                where bm.organization_id = org and bm.user_id = auth.uid()), '{}')
  end;
$$;

create or replace function public.can_access_branch(org uuid, branch uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    public.is_org_member(org)
    and (
      public.org_role(org) in ('owner', 'admin', 'accountant')
      or branch is null
      or branch = any (public.user_branch_ids(org))
    );
$$;

-- ---------------------------------------------------------------------------
-- Journal entries inherit their source order's branch automatically. This keeps
-- accounting a single balanced ledger (branch is only a dimension/tag on the
-- entry) WITHOUT rewriting the large post_sale/post_purchase functions.
-- Manual entries keep whatever branch_id they were given (NULL = company-level).
-- ---------------------------------------------------------------------------
create or replace function public.trg_je_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.branch_id is null and NEW.source_id is not null then
    if NEW.source = 'sale' then
      select branch_id into NEW.branch_id from public.sales_orders where id = NEW.source_id;
    elsif NEW.source = 'purchase' then
      select branch_id into NEW.branch_id from public.purchase_orders where id = NEW.source_id;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists je_set_branch on public.journal_entries;
create trigger je_set_branch before insert on public.journal_entries
  for each row execute function public.trg_je_branch();
