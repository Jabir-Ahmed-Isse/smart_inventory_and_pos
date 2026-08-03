-- ============================================================================
-- Smart Inventory & POS — multi-tenant schema
-- Every business (organization) owns its own users, products, customers,
-- warehouses, invoices and reports. Tenant isolation is enforced with RLS:
-- a row is only visible/writable to members of its organization.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('owner', 'admin', 'manager', 'staff', 'accountant');
create type public.product_status as enum ('active', 'inactive');
create type public.movement_type as enum ('receiving', 'sale', 'transfer', 'adjustment', 'damage', 'lost', 'return');
create type public.sales_status as enum ('draft', 'processing', 'completed', 'refunded', 'cancelled');
create type public.purchase_status as enum ('draft', 'pending', 'received', 'partial', 'overdue', 'cancelled');
create type public.payment_method as enum ('cash', 'card', 'mobile', 'credit');
create type public.txn_type as enum ('income', 'expense');
create type public.log_severity as enum ('info', 'warning', 'critical');

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Identity: profiles (1-1 with auth.users) + organizations + memberships
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  tax_rate numeric(5,2) not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER → bypass RLS to avoid recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(org uuid)
returns public.user_role language sql security definer stable set search_path = public as $$
  select role from public.organization_members
  where organization_id = org and user_id = auth.uid();
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.org_role(org) in ('owner', 'admin');
$$;

-- Create an organization and make the caller its owner. Called right after
-- sign-up so each business gets an isolated workspace.
create or replace function public.create_organization(org_name text, org_slug text default null)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare
  new_org public.organizations;
begin
  insert into public.organizations (name, slug, created_by)
  values (org_name, coalesce(org_slug, lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'))), auth.uid())
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

-- On new auth user, mirror a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalog: categories, brands, units, suppliers, products
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text,
  parent_id uuid references public.categories (id) on delete set null,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.categories (organization_id);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  website text,
  logo_url text,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.brands (organization_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  base_unit boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.units (organization_id);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  payment_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.suppliers (organization_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sku text not null,
  barcode text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  unit_id uuid references public.units (id) on delete set null,
  cost_price numeric(12,2) not null default 0,
  retail_price numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  min_stock integer not null default 0,
  max_stock integer,
  reorder_point integer not null default 0,
  status public.product_status not null default 'active',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);
create index on public.products (organization_id);
create index on public.products (category_id);

-- ---------------------------------------------------------------------------
-- Warehouses + inventory levels + stock movements
-- ---------------------------------------------------------------------------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  location text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.warehouses (organization_id);

create table public.inventory_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse_id)
);
create index on public.inventory_levels (organization_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  type public.movement_type not null,
  quantity integer not null,
  reference text,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.stock_movements (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  segment text,
  credit_limit numeric(12,2) not null default 0,
  loyalty_points integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.customers (organization_id);

-- ---------------------------------------------------------------------------
-- Sales orders (POS + sales) and line items
-- ---------------------------------------------------------------------------
create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_number text not null,
  customer_id uuid references public.customers (id) on delete set null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  status public.sales_status not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method public.payment_method,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);
create index on public.sales_orders (organization_id, created_at desc);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sales_order_id uuid not null references public.sales_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0
);
create index on public.sales_order_items (sales_order_id);

-- ---------------------------------------------------------------------------
-- Purchase orders and line items
-- ---------------------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  po_number text not null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  status public.purchase_status not null default 'draft',
  total numeric(12,2) not null default 0,
  expected_date date,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, po_number)
);
create index on public.purchase_orders (organization_id, created_at desc);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 1,
  unit_cost numeric(12,2) not null default 0
);
create index on public.purchase_order_items (purchase_order_id);

-- ---------------------------------------------------------------------------
-- Finance transactions + audit log
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.txn_type not null,
  category text,
  description text,
  amount numeric(12,2) not null default 0,
  reference text,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.transactions (organization_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id),
  action text not null,
  severity public.log_severity not null default 'info',
  ip_address text,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','categories','brands','suppliers','products',
    'warehouses','customers','sales_orders','purchase_orders'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t
    );
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.categories            enable row level security;
alter table public.brands                enable row level security;
alter table public.units                 enable row level security;
alter table public.suppliers             enable row level security;
alter table public.products              enable row level security;
alter table public.warehouses            enable row level security;
alter table public.inventory_levels      enable row level security;
alter table public.stock_movements       enable row level security;
alter table public.customers             enable row level security;
alter table public.sales_orders          enable row level security;
alter table public.sales_order_items     enable row level security;
alter table public.purchase_orders       enable row level security;
alter table public.purchase_order_items  enable row level security;
alter table public.transactions          enable row level security;
alter table public.audit_logs            enable row level security;

-- Profiles: a user manages their own profile.
create policy "own profile - select" on public.profiles for select using (id = auth.uid());
create policy "own profile - update" on public.profiles for update using (id = auth.uid());
create policy "own profile - insert" on public.profiles for insert with check (id = auth.uid());

-- Organizations: visible to members; only admins/owners can update/delete.
create policy "org - member select" on public.organizations for select using (public.is_org_member(id));
create policy "org - admin update" on public.organizations for update using (public.is_org_admin(id));
create policy "org - admin delete" on public.organizations for delete using (public.is_org_admin(id));
-- (INSERT is done through public.create_organization / RLS-bypassing function.)

-- Organization members: members can view their org's roster; admins manage it.
create policy "members - select" on public.organization_members
  for select using (public.is_org_member(organization_id));
create policy "members - admin insert" on public.organization_members
  for insert with check (public.is_org_admin(organization_id));
create policy "members - admin update" on public.organization_members
  for update using (public.is_org_admin(organization_id));
create policy "members - admin delete" on public.organization_members
  for delete using (public.is_org_admin(organization_id));

-- Generic tenant tables: any member of the org has full CRUD on rows in that org.
do $$
declare t text;
begin
  foreach t in array array[
    'categories','brands','units','suppliers','products','warehouses',
    'inventory_levels','stock_movements','customers','sales_orders',
    'sales_order_items','purchase_orders','purchase_order_items',
    'transactions','audit_logs'
  ]
  loop
    execute format($f$
      create policy "tenant select" on public.%1$I for select using (public.is_org_member(organization_id));
      create policy "tenant insert" on public.%1$I for insert with check (public.is_org_member(organization_id));
      create policy "tenant update" on public.%1$I for update using (public.is_org_member(organization_id));
      create policy "tenant delete" on public.%1$I for delete using (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end$$;
