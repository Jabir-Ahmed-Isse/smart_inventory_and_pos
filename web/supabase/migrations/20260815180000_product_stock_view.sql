-- ============================================================================
-- Performance — product_stock_v view for server-side pagination
--
-- On-hand quantity and stock status are derived by summing inventory_levels,
-- so paginating/filtering/sorting products by stock in SQL needs a pre-aggregated
-- view. `security_invoker = true` means the view runs with the CALLER's rights,
-- so Row-Level Security on products / inventory_levels / categories / brands
-- still applies — tenant isolation is fully preserved, never bypassed.
-- ============================================================================

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
