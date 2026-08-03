-- ---------------------------------------------------------------------------
-- Phase 6.5 — new feature tables: product bundles, shipments, timesheets
-- Reuses the is_org_member / is_org_admin SECURITY DEFINER helpers from the
-- init migration for tenant-scoped RLS.
-- ---------------------------------------------------------------------------

-- Enums -------------------------------------------------------------------
do $$ begin
  create type public.shipment_status as enum ('pending', 'in_transit', 'delivered', 'returned', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timesheet_status as enum ('open', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- Product bundles ---------------------------------------------------------
create table if not exists public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sku text,
  price numeric(12,2) not null default 0,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bundle_id uuid not null references public.product_bundles (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 1
);

-- Shipments ---------------------------------------------------------------
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tracking_number text not null,
  carrier text,
  sales_order_id uuid references public.sales_orders (id) on delete set null,
  destination text,
  status public.shipment_status not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tracking_number)
);

-- Timesheets --------------------------------------------------------------
create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  work_date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  hours numeric(6,2) not null default 0,
  note text,
  status public.timesheet_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes -----------------------------------------------------------------
create index if not exists product_bundles_org_idx on public.product_bundles (organization_id);
create index if not exists bundle_items_bundle_idx on public.bundle_items (bundle_id);
create index if not exists shipments_org_idx on public.shipments (organization_id);
create index if not exists timesheets_org_idx on public.timesheets (organization_id);

-- RLS ---------------------------------------------------------------------
alter table public.product_bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.shipments enable row level security;
alter table public.timesheets enable row level security;

do $$ begin
  create policy "bundles - member all" on public.product_bundles
    for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
  create policy "bundle_items - member all" on public.bundle_items
    for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
  create policy "shipments - member all" on public.shipments
    for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
  create policy "timesheets - member all" on public.timesheets
    for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;
