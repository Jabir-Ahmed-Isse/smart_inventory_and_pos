-- ============================================================================
-- Phase 2 — HR / People
--
-- The employee record model that Payroll (Phase 3) builds on: departments,
-- job positions, employees (with employment + pay details), leave management,
-- and a daily attendance register.
--
-- Access is restricted to management roles (owner/admin/manager/accountant)
-- because employee records carry salary and personal data — enforced in RLS,
-- not just the UI.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'intern', 'temporary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.employee_status as enum ('active', 'on_leave', 'suspended', 'terminated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pay_frequency as enum ('monthly', 'biweekly', 'weekly', 'daily');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'remote');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Departments & positions
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  description text,
  manager_employee_id uuid,             -- set after employees exist (soft link)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists departments_org_idx on public.departments (organization_id);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  department_id uuid references public.departments (id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists positions_org_idx on public.positions (organization_id);

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_number text not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  gender text,
  date_of_birth date,
  national_id text,
  address text,
  photo_url text,
  department_id uuid references public.departments (id) on delete set null,
  position_id uuid references public.positions (id) on delete set null,
  manager_id uuid references public.employees (id) on delete set null,
  employment_type public.employment_type not null default 'full_time',
  status public.employee_status not null default 'active',
  hire_date date not null default current_date,
  termination_date date,
  base_salary numeric(14,2) not null default 0,
  pay_frequency public.pay_frequency not null default 'monthly',
  bank_name text,
  bank_account text,
  mobile_money text,
  emergency_contact_name text,
  emergency_contact_phone text,
  user_id uuid references auth.users (id) on delete set null,   -- optional login link
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_number)
);
create index if not exists employees_org_idx on public.employees (organization_id);
create index if not exists employees_dept_idx on public.employees (department_id);

-- Department manager references an employee (added now to avoid a circular create).
do $$ begin
  alter table public.departments
    add constraint departments_manager_fk
    foreign key (manager_employee_id) references public.employees (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Leave management
-- ---------------------------------------------------------------------------
create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  is_paid boolean not null default true,
  default_days numeric(6,1) not null default 0,   -- annual entitlement
  color text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists leave_types_org_idx on public.leave_types (organization_id);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid references public.leave_types (id) on delete set null,
  start_date date not null,
  end_date date not null,
  days numeric(6,1) not null default 0,
  reason text,
  status public.leave_status not null default 'pending',
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leave_requests_org_idx on public.leave_requests (organization_id, start_date desc);
create index if not exists leave_requests_emp_idx on public.leave_requests (employee_id);

-- ---------------------------------------------------------------------------
-- Attendance register
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null default current_date,
  status public.attendance_status not null default 'present',
  check_in time,
  check_out time,
  hours numeric(6,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists attendance_org_date_idx on public.attendance (organization_id, work_date desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['departments', 'positions', 'employees', 'leave_requests']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Seed standard leave types (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.seed_hr(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not a member of this organization.';
  end if;

  insert into public.leave_types (organization_id, name, code, is_paid, default_days, color)
  select p_org, v.name, v.code, v.is_paid, v.default_days, v.color
  from (values
    ('Annual Leave',       'ANNUAL', true,  21, '#0b7a52'),
    ('Sick Leave',         'SICK',   true,  10, '#c05c6d'),
    ('Unpaid Leave',       'UNPAID', false, 0,  '#8a5cf6'),
    ('Maternity Leave',    'MAT',    true,  90, '#e5a05a'),
    ('Compassionate Leave','COMP',   true,  5,  '#1f6f8b')
  ) as v(name, code, is_paid, default_days, color)
  where not exists (
    select 1 from public.leave_types lt where lt.organization_id = p_org and lt.name = v.name
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security — management roles only (salary/PII sensitive)
-- ---------------------------------------------------------------------------
alter table public.departments    enable row level security;
alter table public.positions      enable row level security;
alter table public.employees      enable row level security;
alter table public.leave_types    enable row level security;
alter table public.leave_requests enable row level security;
alter table public.attendance     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['departments', 'positions', 'employees', 'leave_types', 'leave_requests', 'attendance']
  loop
    execute format('drop policy if exists "hr manage" on public.%I;', t);
    execute format($f$
      create policy "hr manage" on public.%1$I for all
        using (public.org_role(organization_id) in ('owner', 'admin', 'manager', 'accountant'))
        with check (public.org_role(organization_id) in ('owner', 'admin', 'manager', 'accountant'));
    $f$, t);
  end loop;
end$$;
