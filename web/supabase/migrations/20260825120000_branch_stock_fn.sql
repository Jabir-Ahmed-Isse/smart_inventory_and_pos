-- ============================================================================
-- Multi-Branch — cross-branch stock AVAILABILITY (read-only, controlled)
--
-- Branch isolation (RLS) hides other branches' data. But an owner/manager/cashier
-- often needs to know "we're out here — who else has it?" so they can request a
-- transfer. This SECURITY DEFINER function returns per-branch on-hand quantity
-- for the org's products, deliberately spanning ALL branches — but ONLY for a
-- member of that org (is_org_member guard), so tenant isolation is preserved.
-- It exposes quantities for lookup only; it grants NO ability to read or change
-- another branch's records.
-- ============================================================================

create or replace function public.org_branch_stock(p_org uuid)
returns table (
  product_id uuid,
  product_name text,
  sku text,
  min_stock integer,
  branch_id uuid,
  branch_name text,
  qty bigint
)
language sql security definer stable set search_path = public as $$
  select
    p.id, p.name, p.sku, p.min_stock,
    b.id, b.name,
    coalesce(sum(il.quantity), 0)::bigint
  from public.products p
  cross join public.branches b
  left join public.warehouses w
    on w.branch_id = b.id and w.organization_id = p_org
  left join public.inventory_levels il
    on il.warehouse_id = w.id and il.product_id = p.id
  where p.organization_id = p_org
    and b.organization_id = p_org
    and public.is_org_member(p_org)   -- tenant guard: only this org's members
  group by p.id, p.name, p.sku, p.min_stock, b.id, b.name;
$$;
