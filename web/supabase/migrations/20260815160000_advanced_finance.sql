-- ============================================================================
-- Phase 5 — Advanced Finance: Fixed Assets (depreciation) + Budgeting
--
--   * fixed_assets / depreciation_entries — asset register + straight-line
--     depreciation runs that post Dr Depreciation Expense / Cr Accumulated
--     Depreciation into the Phase 1 ledger.
--   * budgets / budget_lines — annual budget by ledger account, compared against
--     actual posted balances for variance reporting.
--   * seed_assets(org) — wires the fixed-asset ledger mappings.
-- ============================================================================

do $$ begin create type public.asset_status as enum ('active', 'fully_depreciated', 'disposed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Fixed assets
-- ---------------------------------------------------------------------------
create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_number text not null,
  name text not null,
  category text,
  acquisition_date date not null default current_date,
  cost numeric(14,2) not null default 0,
  salvage_value numeric(14,2) not null default 0,
  useful_life_months integer not null default 12,
  method text not null default 'straight_line',
  accumulated_depreciation numeric(14,2) not null default 0,
  status public.asset_status not null default 'active',
  notes text,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_number)
);
create index if not exists fixed_assets_org_idx on public.fixed_assets (organization_id);

create table if not exists public.depreciation_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid not null references public.fixed_assets (id) on delete cascade,
  period date not null,
  amount numeric(14,2) not null default 0,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (asset_id, period)
);
create index if not exists depreciation_entries_asset_idx on public.depreciation_entries (asset_id);

-- ---------------------------------------------------------------------------
-- Budgets
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  fiscal_year integer not null,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists budgets_org_idx on public.budgets (organization_id);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  budget_id uuid not null references public.budgets (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id) on delete cascade,
  annual_amount numeric(14,2) not null default 0,
  unique (budget_id, account_id)
);
create index if not exists budget_lines_budget_idx on public.budget_lines (budget_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['fixed_assets', 'budgets']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Seed fixed-asset ledger mappings (idempotent, needs a CoA)
-- ---------------------------------------------------------------------------
create or replace function public.seed_assets(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not a member of this organization.';
  end if;

  if exists (select 1 from public.chart_of_accounts where organization_id = p_org) then
    insert into public.account_mappings (organization_id, key, account_id)
    select p_org, m.key, acc.id
    from (values
      ('fixed_assets',             '1500'),
      ('accumulated_depreciation', '1510'),
      ('depreciation_expense',     '6600')
    ) as m(key, code)
    join public.chart_of_accounts acc on acc.organization_id = p_org and acc.code = m.code
    where not exists (select 1 from public.account_mappings am where am.organization_id = p_org and am.key = m.key);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security — finance roles (owner/admin/accountant)
-- ---------------------------------------------------------------------------
alter table public.fixed_assets         enable row level security;
alter table public.depreciation_entries enable row level security;
alter table public.budgets              enable row level security;
alter table public.budget_lines         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fixed_assets', 'depreciation_entries', 'budgets', 'budget_lines']
  loop
    execute format('drop policy if exists "finance manage" on public.%I;', t);
    execute format($f$
      create policy "finance manage" on public.%1$I for all
        using (public.org_role(organization_id) in ('owner', 'admin', 'accountant'))
        with check (public.org_role(organization_id) in ('owner', 'admin', 'accountant'));
    $f$, t);
  end loop;
end$$;
