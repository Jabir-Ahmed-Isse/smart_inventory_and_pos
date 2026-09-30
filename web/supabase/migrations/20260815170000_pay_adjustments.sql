-- ============================================================================
-- Payroll — per-run adjustments (one-off bonuses & deductions)
--
-- A bonus, overtime, or ad-hoc deduction that applies to ONE employee in ONE
-- pay run (e.g. an Eid bonus in August) — not a recurring salary component.
-- Kept in its own table so it survives regenerating the pay run's payslips and
-- never leaks into other months.
-- ============================================================================

create table if not exists public.pay_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pay_run_id uuid not null references public.pay_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  label text not null,
  adjustment_type public.component_type not null,   -- earning (bonus) | deduction
  amount numeric(14,2) not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists pay_adjustments_run_emp_idx on public.pay_adjustments (pay_run_id, employee_id);

alter table public.pay_adjustments enable row level security;

do $$ begin
  drop policy if exists "payroll manage" on public.pay_adjustments;
  create policy "payroll manage" on public.pay_adjustments for all
    using (public.org_role(organization_id) in ('owner', 'admin', 'accountant'))
    with check (public.org_role(organization_id) in ('owner', 'admin', 'accountant'));
end $$;
