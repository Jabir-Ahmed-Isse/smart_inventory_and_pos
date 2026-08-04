-- ---------------------------------------------------------------------------
-- Payment accounts (banks + mobile money) and the cashier role
--
-- Somali retail runs on bank accounts (Premier, Salaam, Amal, Dahabshiil) and
-- mobile money (EVC Plus, Jeeb, Dahab Plus) rather than physical cash. This
-- migration lets a workspace define named money accounts, track a running
-- balance per account, and route every sale payment into a chosen account.
--
-- It also adds a 'cashier' role: staff place (due) orders, a cashier or
-- accountant settles the payment.
-- Reuses the is_org_member / is_org_admin helpers from the init migration.
-- ---------------------------------------------------------------------------

-- New role + a real 'bank' payment method (safe if already present).
alter type public.user_role add value if not exists 'cashier';
alter type public.payment_method add value if not exists 'bank';

do $$ begin
  create type public.account_kind as enum ('bank', 'mobile', 'cash');
exception when duplicate_object then null; end $$;

-- Money accounts -----------------------------------------------------------
create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,                    -- e.g. "Premier Bank", "EVC Plus"
  kind public.account_kind not null default 'bank',
  provider text,                         -- optional grouping label
  opening_balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_accounts_org_idx on public.payment_accounts (organization_id);

-- Link money movements + orders to the account they settled into.
alter table public.transactions
  add column if not exists account_id uuid references public.payment_accounts (id) on delete set null;
alter table public.sales_orders
  add column if not exists account_id uuid references public.payment_accounts (id) on delete set null;

create index if not exists transactions_account_idx on public.transactions (account_id);

-- Keep updated_at fresh.
drop trigger if exists set_payment_accounts_updated_at on public.payment_accounts;
create trigger set_payment_accounts_updated_at
  before update on public.payment_accounts
  for each row execute function public.set_updated_at();

-- RLS: tenant-scoped, same pattern as every other table.
alter table public.payment_accounts enable row level security;
do $$ begin
  create policy "payment_accounts - member all" on public.payment_accounts
    for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;
