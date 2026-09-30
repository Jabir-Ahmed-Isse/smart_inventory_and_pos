-- ============================================================================
-- Phase 1 — Double-entry Accounting Engine
--
-- Turns the single-entry `transactions` table into a real general ledger, the
-- same backbone QuickBooks and Odoo are built on. Every financial event posts
-- balanced debit/credit lines against a Chart of Accounts.
--
-- Adds:
--   * chart_of_accounts        — the account tree (assets/liabilities/equity/income/expense)
--   * account_mappings         — which account each automated posting uses
--   * journal_entries + lines  — the double-entry ledger (draft → posted → void)
--   * seed_accounting(org)      — installs a standard CoA + mappings (idempotent)
--   * post/void functions       — enforce debits = credits on posting
--   * auto-posting triggers     — a completed sale / received purchase posts a
--                                 journal entry automatically (safely no-ops
--                                 until a CoA is seeded, so POS never breaks)
--   * backfill_accounting(org)  — post ledger entries for existing sales/purchases
--
-- Multi-tenant: every table is RLS-scoped with the existing is_org_member helper.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.journal_source as enum ('manual', 'sale', 'purchase', 'payment', 'payroll', 'adjustment', 'opening');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.journal_status as enum ('draft', 'posted', 'void');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Chart of Accounts
-- ---------------------------------------------------------------------------
create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,                          -- '1000', '4000', ...
  name text not null,                          -- 'Cash on Hand', 'Sales Revenue'
  type public.account_type not null,
  subtype text,                                -- 'current_asset', 'cogs', 'operating_expense', ...
  parent_id uuid references public.chart_of_accounts (id) on delete set null,
  description text,
  is_active boolean not null default true,
  is_system boolean not null default false,    -- seeded accounts: protected from delete
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index if not exists coa_org_idx on public.chart_of_accounts (organization_id);
create index if not exists coa_parent_idx on public.chart_of_accounts (parent_id);

-- ---------------------------------------------------------------------------
-- Account mappings — the account each automated posting flows into
-- ---------------------------------------------------------------------------
create table if not exists public.account_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null,                           -- 'sales_revenue', 'cogs', 'accounts_receivable', ...
  account_id uuid not null references public.chart_of_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);
create index if not exists acc_map_org_idx on public.account_mappings (organization_id);

-- ---------------------------------------------------------------------------
-- Journal entries + lines (the ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entry_number text not null,
  entry_date date not null default current_date,
  memo text,
  reference text,
  source public.journal_source not null default 'manual',
  source_id uuid,                              -- links to the sales_order / purchase_order / ...
  status public.journal_status not null default 'draft',
  posted_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entry_number)
);
create index if not exists je_org_date_idx on public.journal_entries (organization_id, entry_date desc);
create index if not exists je_source_idx on public.journal_entries (organization_id, source, source_id);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id) on delete restrict,
  description text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  line_no integer not null default 0,
  constraint jl_nonneg check (debit >= 0 and credit >= 0),
  constraint jl_one_side check (not (debit > 0 and credit > 0))
);
create index if not exists jl_entry_idx on public.journal_lines (journal_entry_id);
create index if not exists jl_account_idx on public.journal_lines (organization_id, account_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists set_coa_updated_at on public.chart_of_accounts;
create trigger set_coa_updated_at before update on public.chart_of_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists set_je_updated_at on public.journal_entries;
create trigger set_je_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Resolve a mapped account id for an org (null when unmapped).
create or replace function public._acc_map(p_org uuid, p_key text)
returns uuid language sql stable security definer set search_path = public as $$
  select account_id from public.account_mappings
  where organization_id = p_org and key = p_key limit 1;
$$;

-- Next sequential journal number for an org, e.g. 'JE-00007'.
create or replace function public._next_je_number(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select 'JE-' || lpad((
    coalesce(max(nullif(regexp_replace(entry_number, '\D', '', 'g'), '')::bigint), 0) + 1
  )::text, 5, '0')
  from public.journal_entries where organization_id = p_org;
$$;

-- ---------------------------------------------------------------------------
-- Post / void a manual entry (enforces debits = credits)
-- ---------------------------------------------------------------------------
create or replace function public.post_journal_entry(p_entry uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_debit numeric(14,2);
  v_credit numeric(14,2);
  v_status public.journal_status;
begin
  select status into v_status from public.journal_entries where id = p_entry;
  if v_status is null then raise exception 'Journal entry not found.'; end if;
  if v_status = 'posted' then return; end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_debit, v_credit
  from public.journal_lines where journal_entry_id = p_entry;

  if v_debit <> v_credit then
    raise exception 'Entry is not balanced: debits % <> credits %', v_debit, v_credit;
  end if;
  if v_debit = 0 then
    raise exception 'Entry has no amounts to post.';
  end if;

  update public.journal_entries
    set status = 'posted', posted_at = now()
  where id = p_entry;
end;
$$;

create or replace function public.void_journal_entry(p_entry uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.journal_entries set status = 'void' where id = p_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- Automated posting: a completed sale -> a balanced journal entry
--   Dr  Accounts Receivable / Cash      total
--   Dr  Sales Discounts                 discount
--   Dr  Cost of Goods Sold              cogs
--       Cr  Sales Revenue                       subtotal
--       Cr  Sales Tax Payable                    tax
--       Cr  Inventory                            cogs
-- No-ops (returns quietly) until the org has a seeded CoA + mappings, so the
-- POS/checkout path is never blocked by accounting setup.
-- ---------------------------------------------------------------------------
create or replace function public.post_sale_to_ledger(p_so uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  so record;
  v_entry uuid;
  v_ar uuid; v_cash uuid; v_rev uuid; v_tax uuid; v_disc uuid; v_cogs uuid; v_inv uuid;
  v_debit_acct uuid;
  v_cogs_amt numeric(14,2);
  v_ln integer := 0;
begin
  select * into so from public.sales_orders where id = p_so;
  if so is null then return; end if;
  if so.status in ('cancelled', 'refunded', 'draft') then return; end if;

  -- Idempotent: never post the same sale twice.
  if exists (select 1 from public.journal_entries
             where organization_id = so.organization_id and source = 'sale' and source_id = p_so) then
    return;
  end if;

  v_rev := public._acc_map(so.organization_id, 'sales_revenue');
  if v_rev is null then return; end if;  -- CoA not set up yet: skip silently.

  v_ar   := public._acc_map(so.organization_id, 'accounts_receivable');
  v_cash := public._acc_map(so.organization_id, 'cash');
  v_tax  := public._acc_map(so.organization_id, 'sales_tax_payable');
  v_disc := public._acc_map(so.organization_id, 'sales_discount');
  v_cogs := public._acc_map(so.organization_id, 'cogs');
  v_inv  := public._acc_map(so.organization_id, 'inventory');

  v_debit_acct := case when so.payment_method = 'credit' then coalesce(v_ar, v_cash) else coalesce(v_cash, v_ar) end;
  if v_debit_acct is null then return; end if;

  select coalesce(sum(soi.quantity * coalesce(p.cost_price, 0)), 0)
    into v_cogs_amt
  from public.sales_order_items soi
  left join public.products p on p.id = soi.product_id
  where soi.sales_order_id = p_so;

  insert into public.journal_entries (organization_id, entry_number, entry_date, memo, reference, source, source_id, status, posted_at, created_by)
  values (so.organization_id, public._next_je_number(so.organization_id), so.created_at::date,
          'Sale ' || so.order_number, so.order_number, 'sale', p_so, 'posted', now(), so.user_id)
  returning id into v_entry;

  -- Debits
  v_ln := v_ln + 1;
  insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
  values (so.organization_id, v_entry, v_debit_acct, 'Sale ' || so.order_number, so.total, 0, v_ln);

  if coalesce(so.discount, 0) > 0 and v_disc is not null then
    v_ln := v_ln + 1;
    insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
    values (so.organization_id, v_entry, v_disc, 'Discount', so.discount, 0, v_ln);
  end if;

  -- Credits
  v_ln := v_ln + 1;
  insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
  values (so.organization_id, v_entry, v_rev, 'Revenue', 0, so.subtotal, v_ln);

  if coalesce(so.tax, 0) > 0 and v_tax is not null then
    v_ln := v_ln + 1;
    insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
    values (so.organization_id, v_entry, v_tax, 'Sales tax', 0, so.tax, v_ln);
  end if;

  -- COGS / inventory relief (only when both accounts are mapped and there is a cost)
  if v_cogs_amt > 0 and v_cogs is not null and v_inv is not null then
    v_ln := v_ln + 1;
    insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
    values (so.organization_id, v_entry, v_cogs, 'Cost of goods sold', v_cogs_amt, 0, v_ln);
    v_ln := v_ln + 1;
    insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
    values (so.organization_id, v_entry, v_inv, 'Inventory relief', 0, v_cogs_amt, v_ln);
  end if;
exception when others then
  -- Accounting must never block a sale. Surface as a warning and move on.
  raise warning 'post_sale_to_ledger(%) skipped: %', p_so, sqlerrm;
end;
$$;

-- Received purchase -> Dr Inventory, Cr Accounts Payable
create or replace function public.post_purchase_to_ledger(p_po uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  po record;
  v_entry uuid;
  v_inv uuid; v_ap uuid;
begin
  select * into po from public.purchase_orders where id = p_po;
  if po is null then return; end if;
  if po.status not in ('received', 'partial') then return; end if;
  if coalesce(po.total, 0) <= 0 then return; end if;

  if exists (select 1 from public.journal_entries
             where organization_id = po.organization_id and source = 'purchase' and source_id = p_po) then
    return;
  end if;

  v_inv := public._acc_map(po.organization_id, 'inventory');
  v_ap  := public._acc_map(po.organization_id, 'accounts_payable');
  if v_inv is null or v_ap is null then return; end if;

  insert into public.journal_entries (organization_id, entry_number, entry_date, memo, reference, source, source_id, status, posted_at, created_by)
  values (po.organization_id, public._next_je_number(po.organization_id), po.created_at::date,
          'Purchase ' || po.po_number, po.po_number, 'purchase', p_po, 'posted', now(), po.user_id)
  returning id into v_entry;

  insert into public.journal_lines (organization_id, journal_entry_id, account_id, description, debit, credit, line_no)
  values (po.organization_id, v_entry, v_inv, 'Inventory received', po.total, 0, 1),
         (po.organization_id, v_entry, v_ap, 'Payable to supplier', 0, po.total, 2);
exception when others then
  raise warning 'post_purchase_to_ledger(%) skipped: %', p_po, sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers on sales / purchases
-- ---------------------------------------------------------------------------
create or replace function public.trg_sale_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status in ('completed', 'processing')
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    perform public.post_sale_to_ledger(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists sale_to_ledger on public.sales_orders;
create trigger sale_to_ledger
  after insert or update of status on public.sales_orders
  for each row execute function public.trg_sale_ledger();

create or replace function public.trg_purchase_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status in ('received', 'partial')
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    perform public.post_purchase_to_ledger(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists purchase_to_ledger on public.purchase_orders;
create trigger purchase_to_ledger
  after insert or update of status on public.purchase_orders
  for each row execute function public.trg_purchase_ledger();

-- ---------------------------------------------------------------------------
-- Backfill: post ledger entries for sales/purchases that predate the ledger
-- ---------------------------------------------------------------------------
create or replace function public.backfill_accounting(p_org uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not a member of this organization.';
  end if;
  for r in select id from public.sales_orders
           where organization_id = p_org and status in ('completed', 'processing')
           order by created_at loop
    perform public.post_sale_to_ledger(r.id);
    n := n + 1;
  end loop;
  for r in select id from public.purchase_orders
           where organization_id = p_org and status in ('received', 'partial')
           order by created_at loop
    perform public.post_purchase_to_ledger(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed a standard Chart of Accounts + mappings (idempotent per org)
-- ---------------------------------------------------------------------------
create or replace function public.seed_accounting(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a record;
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not a member of this organization.';
  end if;

  -- Standard small-business Chart of Accounts. Insert-if-missing by (org, code).
  insert into public.chart_of_accounts (organization_id, code, name, type, subtype, is_system)
  select p_org, c.code, c.name, c.type::public.account_type, c.subtype, true
  from (values
    -- Assets
    ('1000', 'Cash on Hand',            'asset',     'current_asset'),
    ('1010', 'Bank Accounts',           'asset',     'current_asset'),
    ('1020', 'Mobile Money',            'asset',     'current_asset'),
    ('1100', 'Accounts Receivable',     'asset',     'current_asset'),
    ('1200', 'Inventory',               'asset',     'current_asset'),
    ('1400', 'Prepaid Expenses',        'asset',     'current_asset'),
    ('1500', 'Fixed Assets',            'asset',     'fixed_asset'),
    ('1510', 'Accumulated Depreciation','asset',     'fixed_asset'),
    -- Liabilities
    ('2000', 'Accounts Payable',        'liability', 'current_liability'),
    ('2100', 'Sales Tax / VAT Payable', 'liability', 'current_liability'),
    ('2200', 'Salaries Payable',        'liability', 'current_liability'),
    ('2300', 'Loans Payable',           'liability', 'long_term_liability'),
    -- Equity
    ('3000', 'Owner''s Equity',         'equity',    'equity'),
    ('3100', 'Retained Earnings',       'equity',    'equity'),
    ('3200', 'Owner Drawings',          'equity',    'equity'),
    -- Income
    ('4000', 'Sales Revenue',           'income',    'operating_income'),
    ('4100', 'Other Income',            'income',    'other_income'),
    ('4200', 'Sales Discounts',         'income',    'contra_income'),
    -- Expenses
    ('5000', 'Cost of Goods Sold',      'expense',   'cogs'),
    ('6000', 'Rent Expense',            'expense',   'operating_expense'),
    ('6100', 'Salaries & Wages',        'expense',   'operating_expense'),
    ('6200', 'Utilities',               'expense',   'operating_expense'),
    ('6300', 'Office Supplies',         'expense',   'operating_expense'),
    ('6400', 'Marketing & Advertising', 'expense',   'operating_expense'),
    ('6500', 'Bank Charges',            'expense',   'operating_expense'),
    ('6600', 'Depreciation Expense',    'expense',   'operating_expense'),
    ('6900', 'Other Expense',           'expense',   'operating_expense')
  ) as c(code, name, type, subtype)
  where not exists (
    select 1 from public.chart_of_accounts e
    where e.organization_id = p_org and e.code = c.code
  );

  -- Wire the automated-posting mappings to the accounts just ensured above.
  insert into public.account_mappings (organization_id, key, account_id)
  select p_org, m.key, acc.id
  from (values
    ('cash',                '1000'),
    ('bank',                '1010'),
    ('accounts_receivable', '1100'),
    ('inventory',           '1200'),
    ('accounts_payable',    '2000'),
    ('sales_tax_payable',   '2100'),
    ('salaries_payable',    '2200'),
    ('sales_revenue',       '4000'),
    ('other_income',        '4100'),
    ('sales_discount',      '4200'),
    ('cogs',                '5000'),
    ('rent_expense',        '6000'),
    ('salaries_expense',    '6100'),
    ('other_expense',       '6900'),
    ('retained_earnings',   '3100'),
    ('owner_equity',        '3000')
  ) as m(key, code)
  join public.chart_of_accounts acc
    on acc.organization_id = p_org and acc.code = m.code
  where not exists (
    select 1 from public.account_mappings am
    where am.organization_id = p_org and am.key = m.key
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security (same tenant pattern as the rest of the schema)
-- ---------------------------------------------------------------------------
alter table public.chart_of_accounts enable row level security;
alter table public.account_mappings  enable row level security;
alter table public.journal_entries   enable row level security;
alter table public.journal_lines     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['chart_of_accounts', 'account_mappings', 'journal_entries', 'journal_lines']
  loop
    execute format('drop policy if exists "tenant all" on public.%I;', t);
    execute format($f$
      create policy "tenant all" on public.%1$I for all
        using (public.is_org_member(organization_id))
        with check (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end$$;
