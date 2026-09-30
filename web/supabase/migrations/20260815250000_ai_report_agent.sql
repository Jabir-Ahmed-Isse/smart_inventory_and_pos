-- ============================================================================
-- AI Business Report Agent — settings, report history, and dedup'd alerts.
-- All tenant-scoped by organization_id with the existing is_org_member/org_role
-- helpers. The scheduler writes via the service-role client (bypasses RLS);
-- these policies govern what owners/admins can read & configure in the app.
-- ============================================================================

-- 1) Per-organization agent configuration (one row per org) ------------------
create table if not exists public.ai_report_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default false,
  daily_enabled boolean not null default true,
  daily_time time not null default '08:00',
  weekly_enabled boolean not null default false,
  weekly_dow smallint not null default 1,            -- 0=Sun … 6=Sat
  weekly_time time not null default '08:00',
  deliver_inapp boolean not null default true,
  deliver_whatsapp boolean not null default false,
  deliver_email boolean not null default false,
  whatsapp_number text,
  whatsapp_status text not null default 'not_configured', -- not_configured|connected|error
  last_daily_period date,                            -- last daily report's business day
  last_weekly_period date,                           -- last weekly report's week-start
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_report_settings enable row level security;
do $$ begin
  drop policy if exists "reports settings read" on public.ai_report_settings;
  create policy "reports settings read" on public.ai_report_settings for select
    using (public.is_org_member(organization_id));
  drop policy if exists "reports settings manage" on public.ai_report_settings;
  create policy "reports settings manage" on public.ai_report_settings for all
    using (public.org_role(organization_id) in ('owner', 'admin'))
    with check (public.org_role(organization_id) in ('owner', 'admin'));
end $$;

-- 2) Generated report history (facts + AI insights + delivery log) -----------
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_type text not null,                         -- daily | weekly
  period_start date not null,
  period_end date not null,
  facts jsonb not null default '{}'::jsonb,          -- deterministic business facts
  ai jsonb,                                          -- validated AI insight object (nullable)
  ai_source text not null default 'deterministic',  -- gemini | anthropic | deterministic
  summary text,
  deliveries jsonb not null default '[]'::jsonb,     -- [{channel,status,detail,at}]
  created_at timestamptz not null default now(),
  -- Idempotency: one report per org+type+period. A re-run updates, never dupes.
  unique (organization_id, report_type, period_start, period_end)
);
create index if not exists ai_reports_org_created_idx on public.ai_reports (organization_id, created_at desc);

alter table public.ai_reports enable row level security;
do $$ begin
  drop policy if exists "reports read" on public.ai_reports;
  create policy "reports read" on public.ai_reports for select
    using (public.org_role(organization_id) in ('owner', 'admin', 'manager', 'accountant'));
end $$;

-- 3) Alerts with deduplication (org + entity + type is unique) ---------------
create table if not exists public.report_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,                         -- product | customer | sales | finance
  entity_id text not null default '-',               -- product id / customer id / '-'
  alert_type text not null,                          -- out_of_stock | critical_stock | low_stock | unpaid_customer | overdue_balance | sales_decline | expense_spike
  severity text not null default 'warning',          -- info | warning | critical
  status text not null default 'active',             -- active | resolved
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
  create policy "alerts read" on public.report_alerts for select
    using (public.org_role(organization_id) in ('owner', 'admin', 'manager', 'accountant'));
end $$;
