-- ---------------------------------------------------------------------------
-- Featured products — flag best-sellers to surface as a fast quick-add row at
-- the POS (like a restaurant "Featured Products" strip). Additive & defaulted
-- false, so nothing changes until an owner marks products featured.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists is_featured boolean not null default false;

comment on column public.products.is_featured is 'Show this product in the POS quick-add "Featured" strip.';
