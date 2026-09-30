-- ============================================================================
-- Phase 3 — Payroll, Advances & Loans
--
-- Builds on Phase 2 employees and Phase 1 ledger:
--   * salary_components / employee_components — reusable earnings & deductions
--   * pay_runs / payslips / payslip_items      — monthly payroll batches
--   * employee_advances / advance_repayments   — one-off advances & multi-
--                                                installment loans auto-deducted
--                                                from future payslips
--   * seed_payroll(org)                        — payroll ledger accounts + default
--                                                statutory components
--
-- Payroll posts into the general ledger when a run is approved / paid, and an
-- advance posts when disbursed — all via account_mappings, best-effort so
-- payroll still works even before a Chart of Accounts is installed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin create type public.component_type as enum ('earning', 'deduction');
exception when duplicate_object then null; end $$;

do $$ begin create type public.calc_method as enum ('fixed', 'percent_basic');
exception when duplicate_object then null; end $$;

do $$ begin create type public.payrun_status as enum ('draft', 'approved', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type public.payslip_status as enum ('draft', 'approved', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin create type public.advance_type as enum ('advance', 'loan');
exception when duplicate_object then null; end $$;

do $$ begin create type public.advance_status as enum ('pending', 'approved', 'disbursed', 'settled', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Salary components (org catalog) + per-employee assignments
-- ---------------------------------------------------------------------------
create table if not exists public.salary_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  component_type public.component_type not null,
  calc_method public.calc_method not null default 'fixed',
  amount numeric(14,2) not null default 0,     -- for fixed
  rate numeric(6,3) not null default 0,         -- percent of basic, for percent_basic
  is_statutory boolean not null default false,
  is_taxable boolean not null default true,
  applies_to_all boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists salary_components_org_idx on public.salary_components (organization_id);

create table if not exists public.employee_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  component_id uuid not null references public.salary_components (id) on delete cascade,
  amount numeric(14,2),                         -- override (null = use component default)
  rate numeric(6,3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (employee_id, component_id)
);
create index if not exists employee_components_emp_idx on public.employee_components (employee_id);

-- ---------------------------------------------------------------------------
-- Pay runs, payslips, payslip line items
-- ---------------------------------------------------------------------------
create table if not exists public.pay_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  period_start date not null,
  period_end date not null,
  pay_date date not null default current_date,
  status public.payrun_status not null default 'draft',
  total_gross numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  payment_entry_id uuid references public.journal_entries (id) on delete set null,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pay_runs_org_idx on public.pay_runs (organization_id, period_start desc);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pay_run_id uuid not null references public.pay_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  basic numeric(14,2) not null default 0,
  total_earnings numeric(14,2) not null default 0,   -- basic + earning components
  total_deductions numeric(14,2) not null default 0, -- deduction components (excl. advance)
  advance_repayment numeric(14,2) not null default 0,
  gross numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  status public.payslip_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (pay_run_id, employee_id)
);
create index if not exists payslips_run_idx on public.payslips (pay_run_id);
create index if not exists payslips_emp_idx on public.payslips (employee_id);

create table if not exists public.payslip_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  payslip_id uuid not null references public.payslips (id) on delete cascade,
  component_id uuid references public.salary_components (id) on delete set null,
  label text not null,
  item_type public.component_type not null,
  amount numeric(14,2) not null default 0
);
create index if not exists payslip_items_slip_idx on public.payslip_items (payslip_id);

-- ---------------------------------------------------------------------------
-- Advances & loans
-- ---------------------------------------------------------------------------
create table if not exists public.employee_advances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  advance_type public.advance_type not null default 'advance',
  amount numeric(14,2) not null default 0,         -- principal
  installments integer not null default 1,
  installment_amount numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,        -- remaining to repay
  reason text,
  status public.advance_status not null default 'pending',
  disbursed_at timestamptz,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  approved_by uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advances_org_idx on public.employee_advances (organization_id);
create index if not exists advances_emp_idx on public.employee_advances (employee_id);

create table if not exists public.advance_repayments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  advance_id uuid not null references public.employee_advances (id) on delete cascade,
  payslip_id uuid references public.payslips (id) on delete set null,
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists advance_repayments_adv_idx on public.advance_repayments (advance_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pay_runs', 'employee_advances']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Seed payroll ledger accounts + default statutory components (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.seed_payroll(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not a member of this organization.';
  end if;

  -- Payroll ledger accounts — only if a Chart of Accounts exists for this org.
  if exists (select 1 from public.chart_of_accounts where organization_id = p_org) then
    insert into public.chart_of_accounts (organization_id, code, name, type, subtype, is_system)
    select p_org, c.code, c.name, c.type::public.account_type, c.subtype, true
    from (values
      ('1300', 'Employee Advances',          'asset',     'current_asset'),
      ('2110', 'Payroll Deductions Payable', 'liability', 'current_liability')
    ) as c(code, name, type, subtype)
    where not exists (select 1 from public.chart_of_accounts e where e.organization_id = p_org and e.code = c.code);

    insert into public.account_mappings (organization_id, key, account_id)
    select p_org, m.key, acc.id
    from (values
      ('employee_advances',  '1300'),
      ('deductions_payable', '2110')
    ) as m(key, code)
    join public.chart_of_accounts acc on acc.organization_id = p_org and acc.code = m.code
    where not exists (select 1 from public.account_mappings am where am.organization_id = p_org and am.key = m.key);
  end if;

  -- Default statutory deduction components.
  insert into public.salary_components (organization_id, name, code, component_type, calc_method, rate, is_statutory, is_taxable, applies_to_all)
  select p_org, v.name, v.code, 'deduction'::public.component_type, 'percent_basic'::public.calc_method, v.rate, true, false, true
  from (values
    ('Income Tax (PAYE)', 'PAYE', 6.0),
    ('Social Security',   'NSSF', 5.0)
  ) as v(name, code, rate)
  where not exists (select 1 from public.salary_components sc where sc.organization_id = p_org and sc.name = v.name);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security — management roles only (payroll is highly sensitive)
-- ---------------------------------------------------------------------------
alter table public.salary_components   enable row level security;
alter table public.employee_components enable row level security;
alter table public.pay_runs            enable row level security;
alter table public.payslips            enable row level security;
alter table public.payslip_items       enable row level security;
alter table public.employee_advances   enable row level security;
alter table public.advance_repayments  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['salary_components', 'employee_components', 'pay_runs', 'payslips', 'payslip_items', 'employee_advances', 'advance_repayments']
  loop
    execute format('drop policy if exists "payroll manage" on public.%I;', t);
    execute format($f$
      create policy "payroll manage" on public.%1$I for all
        using (public.org_role(organization_id) in ('owner', 'admin', 'accountant'))
        with check (public.org_role(organization_id) in ('owner', 'admin', 'accountant'));
    $f$, t);
  end loop;
end$$;
