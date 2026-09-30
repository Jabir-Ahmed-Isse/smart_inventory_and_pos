-- ============================================================================
-- Phase 4 — Expenses, Vendor Bills & Recurring Costs (rent, utilities)
--
-- Proper expense management that posts double-entry into the Phase 1 ledger:
--   * expense_categories  — each maps to a ledger expense account
--   * expenses            — vendor bills / expense claims (draft → approved → paid)
--   * recurring_expenses  — templates (e.g. monthly rent) that generate bills
--   * seed_expenses(org)  — default categories mapped to the seeded CoA accounts
--
-- Approve posts  Dr Expense (+ Dr input VAT)  Cr Accounts Payable.
-- Pay posts      Dr Accounts Payable          Cr Cash.
-- Best-effort ledger posting: works before accounting is configured too.
-- ============================================================================

do $$ begin create type public.expense_status as enum ('draft', 'approved', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type public.recurrence as enum ('weekly', 'monthly', 'quarterly', 'yearly');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Categories (mapped to a ledger expense account)
-- ---------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  account_id uuid references public.chart_of_accounts (id) on delete set null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists expense_categories_org_idx on public.expense_categories (organization_id);

-- ---------------------------------------------------------------------------
-- Recurring expense templates
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  category_id uuid references public.expense_categories (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  recurrence public.recurrence not null default 'monthly',
  start_date date not null default current_date,
  next_due_date date not null default current_date,
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recurring_expenses_org_idx on public.recurring_expenses (organization_id);

-- ---------------------------------------------------------------------------
-- Expenses / vendor bills
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  expense_number text not null,
  category_id uuid references public.expense_categories (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  description text,
  amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  expense_date date not null default current_date,
  due_date date,
  status public.expense_status not null default 'draft',
  recurring_id uuid references public.recurring_expenses (id) on delete set null,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  payment_entry_id uuid references public.journal_entries (id) on delete set null,
  notes text,
  created_by uuid references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, expense_number)
);
create index if not exists expenses_org_date_idx on public.expenses (organization_id, expense_date desc);
create index if not exists expenses_status_idx on public.expenses (organization_id, status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['expenses', 'recurring_expenses']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Seed default expense categories from the seeded Chart of Accounts
-- ---------------------------------------------------------------------------
create or replace function public.seed_expenses(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not a member of this organization.';
  end if;

  insert into public.expense_categories (organization_id, name, account_id)
  select p_org, v.name, acc.id
  from (values
    ('Rent',                 '6000'),
    ('Utilities',            '6200'),
    ('Office Supplies',      '6300'),
    ('Marketing & Advertising','6400'),
    ('Bank Charges',         '6500'),
    ('Other Expense',        '6900')
  ) as v(name, code)
  left join public.chart_of_accounts acc on acc.organization_id = p_org and acc.code = v.code
  where not exists (
    select 1 from public.expense_categories ec where ec.organization_id = p_org and ec.name = v.name
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security — finance roles (owner/admin/accountant)
-- ---------------------------------------------------------------------------
alter table public.expense_categories enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.expenses           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['expense_categories', 'recurring_expenses', 'expenses']
  loop
    execute format('drop policy if exists "expense manage" on public.%I;', t);
    execute format($f$
      create policy "expense manage" on public.%1$I for all
        using (public.org_role(organization_id) in ('owner', 'admin', 'accountant', 'manager'))
        with check (public.org_role(organization_id) in ('owner', 'admin', 'accountant', 'manager'));
    $f$, t);
  end loop;
end$$;
