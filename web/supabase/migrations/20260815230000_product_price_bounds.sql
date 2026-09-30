-- ---------------------------------------------------------------------------
-- Per-product selling-price band. A cashier may edit the price at POS, but only
-- within [min_price, max_price] (either bound may be null = open on that side).
-- Set when adding/editing a product. Additive & nullable, so existing products
-- keep selling at their retail price with no bounds until an owner sets them.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists min_price numeric(12,2),
  add column if not exists max_price numeric(12,2);

comment on column public.products.min_price is 'Lowest price a cashier may sell this at (POS floor). Null = no floor.';
comment on column public.products.max_price is 'Highest price a cashier may sell this at (POS ceiling). Null = no ceiling.';
