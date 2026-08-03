import { createClient } from "@/lib/supabase/server";

// Date helpers ---------------------------------------------------------------
function monthKey(iso: string) {
  return iso.slice(0, 7);
}
export function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, label: m.toLocaleDateString("en-US", { month: "short" }) });
  }
  return out;
}
function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ---------------------------------------------------------------------------
// Sales analytics — orders + line items joined to products/categories.
// ---------------------------------------------------------------------------
export type SalesLine = { qty: number; lineTotal: number; product: string; category: string; cost: number };
export type SalesOrderLite = { total: number; discount: number; status: string; payment: string | null; createdAt: string };

export async function getSalesAnalytics(orgId: string) {
  const supabase = await createClient();
  const [ordersRes, itemsRes] = await Promise.all([
    supabase.from("sales_orders").select("total, discount, status, payment_method, created_at").eq("organization_id", orgId),
    supabase.from("sales_order_items").select("quantity, line_total, products(name, cost_price, categories(name)), sales_orders(status, created_at)").eq("organization_id", orgId),
  ]);

  const orders: SalesOrderLite[] = (ordersRes.data ?? []).map((o) => ({
    total: o.total, discount: o.discount ?? 0, status: o.status, payment: o.payment_method, createdAt: o.created_at,
  }));
  const live = orders.filter((o) => o.status !== "cancelled");

  const items = (itemsRes.data ?? []) as unknown as {
    quantity: number; line_total: number;
    products: { name: string; cost_price: number; categories: { name: string } | null } | null;
    sales_orders: { status: string; created_at: string } | null;
  }[];
  const lines: SalesLine[] = items
    .filter((i) => i.sales_orders?.status !== "cancelled")
    .map((i) => ({ qty: i.quantity, lineTotal: i.line_total, product: i.products?.name ?? "—", category: i.products?.categories?.name ?? "Uncategorized", cost: (i.products?.cost_price ?? 0) * i.quantity }));

  const revenue = live.reduce((s, o) => s + o.total, 0);
  const within = (d: number) => live.filter((o) => daysAgo(o.createdAt) < d).reduce((s, o) => s + o.total, 0);

  const byMonth = lastMonths(12).map((m) => ({ label: m.label, value: live.filter((o) => monthKey(o.createdAt) === m.key).reduce((s, o) => s + o.total, 0) }));
  const byYear = new Map<string, number>();
  for (const o of live) byYear.set(o.createdAt.slice(0, 4), (byYear.get(o.createdAt.slice(0, 4)) ?? 0) + o.total);

  const group = (arr: SalesLine[], key: (l: SalesLine) => string) => {
    const m = new Map<string, { revenue: number; qty: number }>();
    for (const l of arr) {
      const g = m.get(key(l)) ?? { revenue: 0, qty: 0 };
      g.revenue += l.lineTotal; g.qty += l.qty; m.set(key(l), g);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
  };

  const methods = ["cash", "card", "mobile", "credit"];
  const byPayment = methods.map((mth) => ({ method: mth, amount: live.filter((o) => o.payment === mth).reduce((s, o) => s + o.total, 0), count: live.filter((o) => o.payment === mth).length }));

  return {
    revenue,
    orders: live.length,
    today: within(1), week: within(7), month: within(30), year: within(365),
    avgOrder: live.length ? revenue / live.length : 0,
    discounts: live.reduce((s, o) => s + o.discount, 0),
    returns: {
      count: orders.filter((o) => o.status === "refunded").length,
      value: orders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.total, 0),
    },
    byMonth,
    byYear: [...byYear.entries()].map(([year, value]) => ({ year, value })).sort((a, b) => a.year.localeCompare(b.year)),
    byProduct: group(lines, (l) => l.product).slice(0, 10),
    byCategory: group(lines, (l) => l.category),
    byPayment,
  };
}

// ---------------------------------------------------------------------------
// Product analytics — profitability per product.
// ---------------------------------------------------------------------------
export async function getProductAnalytics(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales_order_items")
    .select("quantity, line_total, products(name, sku, retail_price, cost_price), sales_orders(status)")
    .eq("organization_id", orgId);

  const items = (data ?? []) as unknown as {
    quantity: number; line_total: number;
    products: { name: string; sku: string; retail_price: number; cost_price: number } | null;
    sales_orders: { status: string } | null;
  }[];

  const map = new Map<string, { name: string; sku: string; units: number; revenue: number; cost: number }>();
  for (const i of items) {
    if (i.sales_orders?.status === "cancelled" || !i.products) continue;
    const k = i.products.sku;
    const g = map.get(k) ?? { name: i.products.name, sku: i.products.sku, units: 0, revenue: 0, cost: 0 };
    g.units += i.quantity; g.revenue += i.line_total; g.cost += i.products.cost_price * i.quantity;
    map.set(k, g);
  }
  const rows = [...map.values()].map((r) => ({ ...r, profit: r.revenue - r.cost, margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0 }));
  return {
    bestSelling: [...rows].sort((a, b) => b.units - a.units).slice(0, 10),
    mostProfitable: [...rows].sort((a, b) => b.profit - a.profit).slice(0, 10),
    slowMoving: [...rows].sort((a, b) => a.units - b.units).slice(0, 10),
    all: rows,
  };
}

// ---------------------------------------------------------------------------
// Customer analytics.
// ---------------------------------------------------------------------------
export async function getCustomerAnalytics(orgId: string) {
  const supabase = await createClient();
  const [custRes, ordersRes] = await Promise.all([
    supabase.from("customers").select("id, name, segment, loyalty_points, created_at").eq("organization_id", orgId),
    supabase.from("sales_orders").select("customer_id, total, status, created_at").eq("organization_id", orgId),
  ]);

  const customers = custRes.data ?? [];
  const orders = (ordersRes.data ?? []).filter((o) => o.status !== "cancelled");

  const spend = new Map<string, { total: number; orders: number }>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const g = spend.get(o.customer_id) ?? { total: 0, orders: 0 };
    g.total += o.total; g.orders += 1; spend.set(o.customer_id, g);
  }

  const enriched = customers.map((c) => {
    const s = spend.get(c.id) ?? { total: 0, orders: 0 };
    return { id: c.id, name: c.name, segment: c.segment, loyalty: c.loyalty_points, orders: s.orders, spend: s.total, clv: s.total };
  });

  const growth = lastMonths(12).map((m) => ({ label: m.label, value: customers.filter((c) => monthKey(c.created_at) === m.key).length }));

  return {
    total: customers.length,
    withOrders: enriched.filter((c) => c.orders > 0).length,
    returning: enriched.filter((c) => c.orders > 1).length,
    avgClv: enriched.length ? enriched.reduce((s, c) => s + c.clv, 0) / enriched.length : 0,
    top: [...enriched].sort((a, b) => b.spend - a.spend).slice(0, 10),
    growth,
  };
}

// ---------------------------------------------------------------------------
// Supplier analytics.
// ---------------------------------------------------------------------------
export async function getSupplierAnalytics(orgId: string) {
  const supabase = await createClient();
  const [supRes, poRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("organization_id", orgId),
    supabase.from("purchase_orders").select("supplier_id, total, status, created_at").eq("organization_id", orgId),
  ]);
  const suppliers = supRes.data ?? [];
  const pos = poRes.data ?? [];

  const enriched = suppliers.map((s) => {
    const theirs = pos.filter((p) => p.supplier_id === s.id && p.status !== "cancelled");
    const outstanding = theirs.filter((p) => ["draft", "pending", "overdue", "partial"].includes(p.status));
    return {
      id: s.id, name: s.name,
      orders: theirs.length,
      value: theirs.reduce((a, p) => a + p.total, 0),
      outstanding: outstanding.reduce((a, p) => a + p.total, 0),
      received: theirs.filter((p) => p.status === "received").length,
    };
  });
  return {
    total: suppliers.length,
    totalValue: enriched.reduce((s, e) => s + e.value, 0),
    totalOutstanding: enriched.reduce((s, e) => s + e.outstanding, 0),
    ranking: [...enriched].sort((a, b) => b.value - a.value),
  };
}

// ---------------------------------------------------------------------------
// Purchase analytics.
// ---------------------------------------------------------------------------
export async function getPurchaseAnalytics(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("po_number, total, status, created_at, suppliers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as { po_number: string; total: number; status: string; created_at: string; suppliers: { name: string } | null }[];
  const live = rows.filter((r) => r.status !== "cancelled");
  const outstanding = live.filter((r) => ["draft", "pending", "overdue", "partial"].includes(r.status));

  return {
    total: live.reduce((s, r) => s + r.total, 0),
    count: live.length,
    outstandingValue: outstanding.reduce((s, r) => s + r.total, 0),
    outstandingCount: outstanding.length,
    received: live.filter((r) => r.status === "received").length,
    byMonth: lastMonths(12).map((m) => ({ label: m.label, value: live.filter((r) => monthKey(r.created_at) === m.key).reduce((s, r) => s + r.total, 0) })),
    orders: rows.slice(0, 15).map((r) => ({ ref: r.po_number, supplier: r.suppliers?.name ?? "Unassigned", total: r.total, status: r.status, date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) })),
  };
}

// ---------------------------------------------------------------------------
// Warehouse analytics — inventory per warehouse + movement counts.
// ---------------------------------------------------------------------------
export async function getWarehouseAnalytics(orgId: string) {
  const supabase = await createClient();
  const [whRes, invRes, mvRes] = await Promise.all([
    supabase.from("warehouses").select("id, name, location, is_primary").eq("organization_id", orgId),
    supabase.from("inventory_levels").select("warehouse_id, quantity, products(retail_price)").eq("organization_id", orgId),
    supabase.from("stock_movements").select("warehouse_id, type, quantity, created_at").eq("organization_id", orgId),
  ]);

  const inv = (invRes.data ?? []) as unknown as { warehouse_id: string; quantity: number; products: { retail_price: number } | null }[];
  const mv = (mvRes.data ?? []) as { warehouse_id: string | null; type: string; quantity: number; created_at: string }[];

  const warehouses = (whRes.data ?? []).map((w) => {
    const levels = inv.filter((l) => l.warehouse_id === w.id);
    const moves = mv.filter((m) => m.warehouse_id === w.id);
    return {
      id: w.id, name: w.name, location: w.location, isPrimary: w.is_primary,
      units: levels.reduce((s, l) => s + l.quantity, 0),
      value: levels.reduce((s, l) => s + l.quantity * (l.products?.retail_price ?? 0), 0),
      receiving: moves.filter((m) => m.type === "receiving").length,
      dispatch: moves.filter((m) => m.type === "sale").length,
      transfers: moves.filter((m) => m.type === "transfer").length,
    };
  });

  return {
    warehouses,
    totalUnits: warehouses.reduce((s, w) => s + w.units, 0),
    totalValue: warehouses.reduce((s, w) => s + w.value, 0),
    receiving: mv.filter((m) => m.type === "receiving").length,
    dispatch: mv.filter((m) => m.type === "sale").length,
    transfers: mv.filter((m) => m.type === "transfer").length,
  };
}
