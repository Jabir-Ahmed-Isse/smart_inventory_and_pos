-- ============================================================================
-- seed_demo_data(org): populate an organization with representative sample
-- data so a freshly created workspace isn't empty. Callable from the app
-- ("Load sample data"). SECURITY DEFINER but gated to org admins/owners.
-- ============================================================================
create or replace function public.seed_demo_data(org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cat_furniture uuid; cat_electronics uuid; cat_office uuid;
  brand_deskpro uuid; brand_techcorp uuid;
  unit_pc uuid;
  wh_central uuid; wh_retail uuid;
  sup_apex uuid;
  p_chair uuid; p_laptop uuid; p_paper uuid;
begin
  if not public.is_org_admin(org) then
    raise exception 'Only organization admins can seed demo data';
  end if;

  -- Avoid double-seeding.
  if exists (select 1 from public.products where organization_id = org) then
    return;
  end if;

  insert into public.categories (organization_id, name, slug) values
    (org, 'Furniture', 'furniture') returning id into cat_furniture;
  insert into public.categories (organization_id, name, slug) values
    (org, 'Electronics', 'electronics') returning id into cat_electronics;
  insert into public.categories (organization_id, name, slug) values
    (org, 'Office Supplies', 'office-supplies') returning id into cat_office;

  insert into public.brands (organization_id, name, website) values
    (org, 'DeskPro', 'deskpro.com') returning id into brand_deskpro;
  insert into public.brands (organization_id, name, website) values
    (org, 'TechCorp', 'techcorp.io') returning id into brand_techcorp;

  insert into public.units (organization_id, name, code, base_unit) values
    (org, 'Piece', 'pc', true) returning id into unit_pc;

  insert into public.warehouses (organization_id, name, code, location, is_primary) values
    (org, 'Central Distribution', 'WH-CENTRAL', 'Seattle, WA', true) returning id into wh_central;
  insert into public.warehouses (organization_id, name, code, location) values
    (org, 'Downtown Retail Store', 'WH-RETAIL', 'Front Floor') returning id into wh_retail;

  insert into public.suppliers (organization_id, name, contact_name, email, payment_terms) values
    (org, 'Apex Electronics', 'Sarah Jenkins', 's.jenkins@apexelectronics.com', 'Net 45')
    returning id into sup_apex;

  insert into public.products (organization_id, name, sku, category_id, brand_id, supplier_id, unit_id, cost_price, retail_price, min_stock, reorder_point)
    values (org, 'ErgoPro Office Chair', 'FUR-092-B', cat_furniture, brand_deskpro, sup_apex, unit_pc, 180, 299, 20, 40)
    returning id into p_chair;
  insert into public.products (organization_id, name, sku, category_id, brand_id, supplier_id, unit_id, cost_price, retail_price, min_stock, reorder_point)
    values (org, 'UltraBook Pro 15"', 'LPT-554-S', cat_electronics, brand_techcorp, sup_apex, unit_pc, 950, 1299, 15, 25)
    returning id into p_laptop;
  insert into public.products (organization_id, name, sku, category_id, brand_id, supplier_id, unit_id, cost_price, retail_price, min_stock, reorder_point)
    values (org, 'Premium A4 Paper Ream', 'OFF-001-A4', cat_office, null, sup_apex, unit_pc, 4, 6.5, 200, 300)
    returning id into p_paper;

  insert into public.inventory_levels (organization_id, product_id, warehouse_id, quantity) values
    (org, p_chair, wh_central, 450),
    (org, p_laptop, wh_central, 12),
    (org, p_paper, wh_central, 1250);

  insert into public.customers (organization_id, name, email, phone, segment, loyalty_points) values
    (org, 'Apex Corp Solutions', 'sarah.j@apex.com', '+1 (555) 019-2834', 'VIP', 2400),
    (org, 'Global Merchants Ltd.', 'purchasing@globalmerchants.co', '+44 20 7123 4567', 'Distributor', 900),
    (org, 'TechTronics Inc.', 'orders@techtronics.com', '+1 (555) 882-1044', 'Retail Partner', 450);

  insert into public.transactions (organization_id, type, category, description, amount) values
    (org, 'income', 'Sales Revenue', 'Store Front POS #4', 4520.50),
    (org, 'expense', 'Freight', 'Logistics Supplier INC', 1250.00),
    (org, 'expense', 'Inventory Restock', 'Wholesale Goods Co.', 8450.00);
end;
$$;
