-- ============================================================================
-- Multi-Branch — Phase 3a: branch-level RLS enforcement
--
-- Adds a RESTRICTIVE "branch scope" policy to each branch-owned table. A
-- restrictive policy is AND-ed with the existing permissive tenant policies, so
-- this LAYERS branch isolation on top WITHOUT dropping or rewriting anything:
--   visible/writable  ⇔  is_org_member(org)  AND  can_access_branch(org, branch)
--
-- can_access_branch() already lets owner/admin/accountant (org-wide) and NULL
-- (company-level) rows through, so existing single-branch orgs and org-wide
-- users are completely unaffected. Only branch-scoped roles (manager/cashier/
-- staff) are constrained to their assigned branches — enforced at the DATABASE,
-- so URL/API tampering cannot cross branches. The service-role client (cron,
-- backfill, admin tasks) bypasses RLS entirely and is unaffected.
--
-- Note: this phase enforces the record-level tables. Line-item tables
-- (sales_order_items, purchase_order_items, journal_lines) and inventory_levels
-- remain org-scoped for now (they are reached through their branch-scoped
-- parents); tightening those via parent joins is a later hardening step.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'sales_orders', 'purchase_orders', 'stock_movements',
    'expenses', 'transactions', 'employees', 'journal_entries', 'warehouses'
  ]
  loop
    execute format('drop policy if exists "branch scope" on public.%I;', t);
    execute format($f$
      create policy "branch scope" on public.%1$I as restrictive for all
        using (public.can_access_branch(organization_id, branch_id))
        with check (public.can_access_branch(organization_id, branch_id));
    $f$, t);
  end loop;
end$$;
