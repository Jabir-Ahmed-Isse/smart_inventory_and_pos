-- ============================================================================
-- Multi-Branch — Phase 2b: default-branch BACKFILL (data migration)
--
-- REVIEW BEFORE RUNNING ON PRODUCTION. Strategy (approved):
--   * every org that has no branch yet gets ONE default branch named after the
--     org itself, code 'MAIN';
--   * every existing warehouse and operational row is tagged to that branch
--     (rows are matched through their warehouse where one exists);
--   * every existing member is assigned to the default branch so nobody loses
--     access once branch enforcement is turned on later.
-- Idempotent: re-running only fills rows that are still NULL / missing.
-- "Primary branch" for an org = its 'MAIN' branch, else its earliest branch.
-- ============================================================================

-- 1) One default branch per org that has none.
insert into public.branches (organization_id, name, code, is_active)
select o.id, o.name, 'MAIN', true
from public.organizations o
where not exists (select 1 from public.branches b where b.organization_id = o.id);

-- Helper expression (repeated as a correlated subquery below):
--   primary branch id for org X =
--     select id from branches where organization_id = X
--     order by (code = 'MAIN') desc, created_at asc limit 1

-- 2) Warehouses → primary branch (the anchor).
update public.warehouses w
set branch_id = (
  select b.id from public.branches b
  where b.organization_id = w.organization_id
  order by (b.code = 'MAIN') desc, b.created_at asc limit 1
)
where w.branch_id is null;

-- 3) Warehouse-derived rows → the branch of their warehouse.
update public.sales_orders so
set branch_id = w.branch_id
from public.warehouses w
where so.warehouse_id = w.id and so.branch_id is null and w.branch_id is not null;

update public.purchase_orders po
set branch_id = w.branch_id
from public.warehouses w
where po.warehouse_id = w.id and po.branch_id is null and w.branch_id is not null;

update public.stock_movements sm
set branch_id = w.branch_id
from public.warehouses w
where sm.warehouse_id = w.id and sm.branch_id is null and w.branch_id is not null;

-- 4) Fallback for operational rows still NULL (no warehouse) → primary branch.
update public.sales_orders so
set branch_id = (select b.id from public.branches b where b.organization_id = so.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
where so.branch_id is null;

update public.purchase_orders po
set branch_id = (select b.id from public.branches b where b.organization_id = po.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
where po.branch_id is null;

update public.stock_movements sm
set branch_id = (select b.id from public.branches b where b.organization_id = sm.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
where sm.branch_id is null;

-- 5) Expenses, transactions, employees → primary branch (historical data shows
--    under the default location; company-wide items can be re-tagged to NULL later).
update public.expenses e
set branch_id = (select b.id from public.branches b where b.organization_id = e.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
where e.branch_id is null;

update public.transactions t
set branch_id = (select b.id from public.branches b where b.organization_id = t.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
where t.branch_id is null;

update public.employees em
set branch_id = (select b.id from public.branches b where b.organization_id = em.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
where em.branch_id is null;

-- 6) Journal entries inherit the branch of their source sale/purchase; MANUAL
--    entries intentionally stay NULL (company-level).
update public.journal_entries je
set branch_id = so.branch_id
from public.sales_orders so
where je.source = 'sale' and je.source_id = so.id and je.branch_id is null and so.branch_id is not null;

update public.journal_entries je
set branch_id = po.branch_id
from public.purchase_orders po
where je.source = 'purchase' and je.source_id = po.id and je.branch_id is null and po.branch_id is not null;

-- 7) Assign every existing member to the org's primary branch so non-admins keep
--    their current access (owner/admin/accountant are org-wide regardless).
insert into public.branch_members (organization_id, user_id, branch_id)
select m.organization_id, m.user_id,
       (select b.id from public.branches b where b.organization_id = m.organization_id order by (b.code='MAIN') desc, b.created_at asc limit 1)
from public.organization_members m
where not exists (
  select 1 from public.branch_members bm
  where bm.organization_id = m.organization_id and bm.user_id = m.user_id
)
on conflict do nothing;
