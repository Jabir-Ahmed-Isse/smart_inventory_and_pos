-- ============================================================================
-- Inventory Pro — pending migrations (run once in the Supabase SQL editor)
--
-- Combines the 7 migrations added recently. Every statement is idempotent
-- (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS), so running this
-- whole block once is safe, and running it again is harmless.
--
-- NOTE: section 1 (pay_adjustments) needs the payroll migration
-- (20260815140000_payroll.sql) already applied. If you get an error there about
-- pay_runs / employees / component_type not existing, apply that first, then
-- re-run this block — the other 6 sections are independent and will still apply.
-- ============================================================================


-- 1) Payroll: one-off per-run bonuses & deductions -------------------------
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


-- 2) Products: pre-aggregated stock view for fast pagination ---------------
create or replace view public.product_stock_v with (security_invoker = true) as
select
  p.id,
  p.organization_id,
  p.name,
  p.sku,
  p.retail_price,
  p.min_stock,
  p.image_url,
  c.name as category_name,
  b.name as brand_name,
  coalesce(sum(il.quantity), 0)::int as qty,
  (case
     when coalesce(sum(il.quantity), 0) <= 0 then 'out'
     when coalesce(sum(il.quantity), 0) <= p.min_stock then 'low'
     else 'in'
   end) as status,
  p.created_at
from public.products p
left join public.categories c on c.id = p.category_id
left join public.brands b on b.id = p.brand_id
left join public.inventory_levels il on il.product_id = p.id
group by p.id, c.name, b.name;


-- 3) + 4) Organization: logo + full company profile ------------------------
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists legal_name text;
alter table public.organizations add column if not exists industry text;
alter table public.organizations add column if not exists email text;
alter table public.organizations add column if not exists phone text;
alter table public.organizations add column if not exists website text;
alter table public.organizations add column if not exists tax_id text;
alter table public.organizations add column if not exists registration_number text;
alter table public.organizations add column if not exists address_line1 text;
alter table public.organizations add column if not exists address_line2 text;
alter table public.organizations add column if not exists city text;
alter table public.organizations add column if not exists state_region text;
alter table public.organizations add column if not exists postal_code text;
alter table public.organizations add column if not exists country text;


-- 5) Members: multi-role (primary role + extra roles) ----------------------
alter table public.organization_members
  add column if not exists extra_roles public.user_role[] not null default '{}';

comment on column public.organization_members.extra_roles is
  'Additional roles beyond the primary `role`. Effective roles = role ∪ extra_roles.';


-- 6) Organization: editable sidebar / POS tagline --------------------------
alter table public.organizations
  add column if not exists tagline text;

comment on column public.organizations.tagline is
  'Short slogan shown under the company name in the sidebar / POS brand mark.';


-- 7) Products: per-product selling-price band (POS floor / ceiling) --------
alter table public.products
  add column if not exists min_price numeric(12,2),
  add column if not exists max_price numeric(12,2);

comment on column public.products.min_price is 'Lowest price a cashier may sell this at (POS floor). Null = no floor.';
comment on column public.products.max_price is 'Highest price a cashier may sell this at (POS ceiling). Null = no ceiling.';


-- 8) Products: featured flag (POS quick-add strip) -------------------------
alter table public.products
  add column if not exists is_featured boolean not null default false;

comment on column public.products.is_featured is 'Show this product in the POS quick-add "Featured" strip.';


-- 9) AI Business Report Agent: settings + report history + dedup'd alerts ----
create table if not exists public.ai_report_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default false,
  daily_enabled boolean not null default true,
  daily_time time not null default '08:00',
  weekly_enabled boolean not null default false,
  weekly_dow smallint not null default 1,
  weekly_time time not null default '08:00',
  deliver_inapp boolean not null default true,
  deliver_whatsapp boolean not null default false,
  deliver_email boolean not null default false,
  whatsapp_number text,
  whatsapp_status text not null default 'not_configured',
  last_daily_period date,
  last_weekly_period date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_report_settings enable row level security;
do $$ begin
  drop policy if exists "reports settings read" on public.ai_report_settings;
  create policy "reports settings read" on public.ai_report_settings for select using (public.is_org_member(organization_id));
  drop policy if exists "reports settings manage" on public.ai_report_settings;
  create policy "reports settings manage" on public.ai_report_settings for all
    using (public.org_role(organization_id) in ('owner','admin')) with check (public.org_role(organization_id) in ('owner','admin'));
end $$;

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_type text not null,
  period_start date not null,
  period_end date not null,
  facts jsonb not null default '{}'::jsonb,
  ai jsonb,
  ai_source text not null default 'deterministic',
  summary text,
  deliveries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, report_type, period_start, period_end)
);
create index if not exists ai_reports_org_created_idx on public.ai_reports (organization_id, created_at desc);
alter table public.ai_reports enable row level security;
do $$ begin
  drop policy if exists "reports read" on public.ai_reports;
  create policy "reports read" on public.ai_reports for select using (public.org_role(organization_id) in ('owner','admin','manager','accountant'));
end $$;

create table if not exists public.report_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id text not null default '-',
  alert_type text not null,
  severity text not null default 'warning',
  status text not null default 'active',
  message text not null,
  first_seen timestamptz not null default now(),
  last_notified timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, entity_type, entity_id, alert_type)
);
create index if not exists report_alerts_org_status_idx on public.report_alerts (organization_id, status);
alter table public.report_alerts enable row level security;
do $$ begin
  drop policy if exists "alerts read" on public.report_alerts;
  create policy "alerts read" on public.report_alerts for select using (public.org_role(organization_id) in ('owner','admin','manager','accountant'));
end $$;

-- Done. Reload the app (hard refresh) after this completes.
