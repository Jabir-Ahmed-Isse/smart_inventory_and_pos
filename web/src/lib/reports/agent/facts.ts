import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportPeriod } from "./period";

// ---------------------------------------------------------------------------
// Deterministic business facts. EVERY number here comes from the org's live
// data — the AI never computes these. Tenant-safe: all queries filter by
// organization_id and the period window. Bounded (top-N lists) for cost/perf.
// ---------------------------------------------------------------------------

export type UnpaidOrder = { orderNumber: string; customerName: string; total: number; paid: number; due: number; date: string; daysOutstanding: number };
export type Reversal = { orderNumber: string; customerName: string; total: number; status: string; date: string };
export type LowStock = { name: string; sku: string; warehouse: string | null; qty: number; minStock: number; avgDailySales: number; daysRemaining: number | null; recommendedReorder: number; supplier: string | null };
export type Receivable = { customerName: string; outstanding: number; orders: number; oldestDueDays: number };
export type TopProduct = { name: string; sku: string; units: number; revenue: number };

export type ReportFacts = {
  period: { type: string; label: string; start: string; end: string; timezone: string };
  currency: string;
  sales: {
    total: number; orders: number; avgOrder: number; discounts: number; tax: number;
    paidTotal: number; dueTotal: number;
    byPaymentMethod: { method: string; amount: number; orders: number }[];
    topProducts: TopProduct[];
    topCategory: { category: string; revenue: number } | null;
    prevTotal: number; changePct: number | null;
  };
  payments: { collected: number; unpaid: number };
  unpaidOrders: UnpaidOrder[];
  reversals: Reversal[];
  profit: { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number; marginPct: number | null; prevNetProfit: number; changePct: number | null };
  expenses: { total: number; byCategory: { category: string; amount: number }[]; largest: { description: string; amount: number }[] };
  inventory: { totalSkus: number; inventoryValue: number; outOfStock: number; critical: number; lowStock: number };
  lowStockItems: LowStock[];
  criticalStock: LowStock[];
  reorderRecommendations: LowStock[];
  receivables: { total: number; customers: Receivable[] };
  purchasing: { purchases: number; purchaseOrders: number; pendingOrders: number };
  /** Per-branch sales split for the period. Empty for single-branch orgs. */
  branchBreakdown: { name: string; sales: number; orders: number; sharePct: number }[];
};

type OrderRow = { id: string; order_number: string; total: number; subtotal: number; discount: number; tax: number; status: string; payment_method: string | null; customer_id: string | null; created_at: string; branch_id: string | null };
type ItemRow = { sales_order_id: string; product_id: string | null; quantity: number; unit_price: number; line_total: number };
type TxnRow = { type: string; category: string | null; description: string | null; amount: number; reference: string | null; created_at: string };
type ProductRow = { id: string; name: string; sku: string; cost_price: number; retail_price: number; min_stock: number; reorder_point: number | null; categories: { name: string } | null; inventory_levels: { quantity: number; warehouses: { name: string } | null }[] | null };

const round = (n: number) => Math.round(n * 100) / 100;
const pctChange = (cur: number, prev: number): number | null => (prev <= 0 ? (cur > 0 ? 100 : null) : round(((cur - prev) / prev) * 100));
const dayFmt = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
const daysBetween = (from: string, to: Date) => Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 86400000));

/**
 * Builds the full deterministic facts object for one org + period.
 * @param admin a Supabase client (service-role from the scheduler, or RLS from
 *              the app) — queries are always explicitly scoped by organization_id.
 */
export async function buildReportFacts(admin: SupabaseClient, orgId: string, currency: string, period: ReportPeriod): Promise<ReportFacts> {
  const now = new Date();
  const win90 = new Date(now.getTime() - 90 * 86400000).toISOString();
  const win30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const tz = period.timezone;

  const [recentRes, prevRes, periodTxnRes, incomeRes, productsRes, customersRes, poRes] = await Promise.all([
    admin.from("sales_orders").select("id, order_number, total, subtotal, discount, tax, status, payment_method, customer_id, created_at, branch_id")
      .eq("organization_id", orgId).gte("created_at", win90).order("created_at", { ascending: false }),
    admin.from("sales_orders").select("total, status")
      .eq("organization_id", orgId).gte("created_at", period.prevStartISO).lt("created_at", period.prevEndISO),
    admin.from("transactions").select("type, category, description, amount, reference, created_at")
      .eq("organization_id", orgId).gte("created_at", period.startISO).lt("created_at", period.endISO),
    admin.from("transactions").select("amount, reference").eq("organization_id", orgId).eq("type", "income").gte("created_at", win90),
    admin.from("products").select("id, name, sku, cost_price, retail_price, min_stock, reorder_point, categories(name), inventory_levels(quantity, warehouses(name))").eq("organization_id", orgId),
    admin.from("customers").select("id, name").eq("organization_id", orgId),
    admin.from("purchase_orders").select("id, total, status, created_at").eq("organization_id", orgId).gte("created_at", win90),
  ]);

  const recent = (recentRes.data ?? []) as OrderRow[];
  const products = (productsRes.data ?? []) as unknown as ProductRow[];
  const custName = new Map((((customersRes.data ?? []) as { id: string; name: string }[])).map((c) => [c.id, c.name] as const));

  // Paid-per-order from income transactions keyed by order number.
  const paidByRef = new Map<string, number>();
  for (const t of (incomeRes.data ?? []) as { amount: number; reference: string | null }[]) {
    if (t.reference) paidByRef.set(t.reference, (paidByRef.get(t.reference) ?? 0) + Number(t.amount));
  }

  const inPeriod = (iso: string) => iso >= period.startISO && iso < period.endISO;
  const nonVoid = (s: string) => s !== "cancelled" && s !== "refunded";

  // ---- Sales (period) ----
  const periodOrders = recent.filter((o) => inPeriod(o.created_at));
  const soldOrders = periodOrders.filter((o) => nonVoid(o.status));
  const salesTotal = round(soldOrders.reduce((s, o) => s + o.total, 0));
  const orders = soldOrders.length;
  const discounts = round(soldOrders.reduce((s, o) => s + (o.discount ?? 0), 0));
  const tax = round(soldOrders.reduce((s, o) => s + (o.tax ?? 0), 0));

  // ---- Per-branch breakdown (period) — powers branch intelligence in reports ----
  const { data: branchRows } = await admin.from("branches").select("id, name").eq("organization_id", orgId);
  const branchName = new Map(((branchRows ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name] as const));
  const branchAgg = new Map<string, { sales: number; orders: number }>();
  for (const o of soldOrders) {
    if (!o.branch_id) continue;
    const a = branchAgg.get(o.branch_id) ?? { sales: 0, orders: 0 };
    a.sales += o.total; a.orders += 1; branchAgg.set(o.branch_id, a);
  }
  const branchBreakdown = branchAgg.size > 1
    ? Array.from(branchAgg.entries())
        .map(([id, a]) => ({ name: branchName.get(id) ?? "—", sales: round(a.sales), orders: a.orders, sharePct: salesTotal > 0 ? Math.round((a.sales / salesTotal) * 100) : 0 }))
        .sort((x, y) => y.sales - x.sales)
    : [];

  // Items for period + last-30d velocity (one fetch over recent order ids).
  const recentIds = recent.map((o) => o.id);
  let items: ItemRow[] = [];
  if (recentIds.length) {
    const { data } = await admin.from("sales_order_items").select("sales_order_id, product_id, quantity, unit_price, line_total").eq("organization_id", orgId).in("sales_order_id", recentIds);
    items = (data ?? []) as ItemRow[];
  }
  const orderById = new Map(recent.map((o) => [o.id, o] as const));
  const periodOrderIds = new Set(soldOrders.map((o) => o.id));
  const in30OrderIds = new Set(recent.filter((o) => o.created_at >= win30 && nonVoid(o.status)).map((o) => o.id));
  const prodById = new Map(products.map((p) => [p.id, p] as const));

  // Top products in period.
  const prodAgg = new Map<string, { units: number; revenue: number }>();
  const sold30 = new Map<string, number>();
  const catAgg = new Map<string, number>();
  let cogs = 0;
  for (const it of items) {
    if (!it.product_id) continue;
    if (periodOrderIds.has(it.sales_order_id)) {
      const a = prodAgg.get(it.product_id) ?? { units: 0, revenue: 0 };
      a.units += it.quantity; a.revenue += it.line_total; prodAgg.set(it.product_id, a);
      const p = prodById.get(it.product_id);
      if (p) { cogs += it.quantity * (p.cost_price ?? 0); catAgg.set(p.categories?.name ?? "Uncategorized", (catAgg.get(p.categories?.name ?? "Uncategorized") ?? 0) + it.line_total); }
    }
    if (in30OrderIds.has(it.sales_order_id)) sold30.set(it.product_id, (sold30.get(it.product_id) ?? 0) + it.quantity);
  }
  const topProducts: TopProduct[] = Array.from(prodAgg.entries())
    .map(([id, a]) => ({ name: prodById.get(id)?.name ?? "—", sku: prodById.get(id)?.sku ?? "—", units: a.units, revenue: round(a.revenue) }))
    .sort((x, y) => y.units - x.units).slice(0, 10);
  const topCategory = Array.from(catAgg.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Sales by payment method.
  const pmAgg = new Map<string, { amount: number; orders: number }>();
  for (const o of soldOrders) {
    const m = o.payment_method ?? "unpaid";
    const a = pmAgg.get(m) ?? { amount: 0, orders: 0 };
    a.amount += o.total; a.orders += 1; pmAgg.set(m, a);
  }
  const byPaymentMethod = Array.from(pmAgg.entries()).map(([method, a]) => ({ method, amount: round(a.amount), orders: a.orders })).sort((x, y) => y.amount - x.amount);

  // Paid / due within the period.
  const dueOf = (o: OrderRow) => round(o.total - (paidByRef.get(o.order_number) ?? 0));
  let paidTotal = 0, dueTotal = 0;
  const unpaidOrders: UnpaidOrder[] = [];
  for (const o of soldOrders) {
    const paid = Math.min(o.total, paidByRef.get(o.order_number) ?? 0);
    const due = dueOf(o);
    paidTotal += paid;
    if (due > 0.005) {
      dueTotal += due;
      unpaidOrders.push({ orderNumber: o.order_number, customerName: o.customer_id ? (custName.get(o.customer_id) ?? "Customer not recorded") : "Customer not recorded", total: round(o.total), paid: round(paid), due, date: dayFmt(o.created_at, tz), daysOutstanding: daysBetween(o.created_at, now) });
    }
  }
  unpaidOrders.sort((a, b) => b.due - a.due);

  const prevOrders = (prevRes.data ?? []) as { total: number; status: string }[];
  const prevTotal = round(prevOrders.filter((o) => nonVoid(o.status)).reduce((s, o) => s + o.total, 0));

  // ---- Reversals (cancelled / refunded in period) ----
  const reversals: Reversal[] = periodOrders.filter((o) => !nonVoid(o.status))
    .map((o) => ({ orderNumber: o.order_number, customerName: o.customer_id ? (custName.get(o.customer_id) ?? "Customer not recorded") : "Customer not recorded", total: round(o.total), status: o.status, date: dayFmt(o.created_at, tz) }))
    .slice(0, 20);

  // ---- Expenses (period) ----
  const periodTxns = (periodTxnRes.data ?? []) as TxnRow[];
  const expenseTxns = periodTxns.filter((t) => t.type === "expense");
  const expTotal = round(expenseTxns.reduce((s, t) => s + Number(t.amount), 0));
  const expByCat = new Map<string, number>();
  for (const t of expenseTxns) expByCat.set(t.category ?? "Other", (expByCat.get(t.category ?? "Other") ?? 0) + Number(t.amount));
  const byCategory = Array.from(expByCat.entries()).map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  const largest = expenseTxns.map((t) => ({ description: t.description ?? t.category ?? "Expense", amount: round(Number(t.amount)) })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const collected = round(periodTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0));

  // ---- Profit (revenue − cogs = gross; gross − expenses = net) ----
  const revenue = salesTotal;
  const grossProfit = round(revenue - cogs);
  const netProfit = round(grossProfit - expTotal);
  const marginPct = revenue > 0 ? round((netProfit / revenue) * 100) : null;
  const prevNetProfit = prevTotal; // prev revenue proxy; refined once prev COGS/expenses tracked

  // ---- Inventory ----
  const qtyOf = (p: ProductRow) => (p.inventory_levels ?? []).reduce((s, l) => s + (l.quantity ?? 0), 0);
  const whOf = (p: ProductRow) => (p.inventory_levels ?? []).find((l) => (l.quantity ?? 0) > 0)?.warehouses?.name ?? (p.inventory_levels?.[0]?.warehouses?.name ?? null);
  let inventoryValue = 0, outOfStock = 0, lowCount = 0, criticalCount = 0;
  const lowList: LowStock[] = [];
  const critList: LowStock[] = [];
  for (const p of products) {
    const qty = qtyOf(p);
    inventoryValue += qty * (p.retail_price ?? 0);
    const min = p.min_stock ?? 0;
    const velocity = round((sold30.get(p.id) ?? 0) / 30); // avg units/day (last 30d)
    const daysRemaining = velocity > 0 ? round(qty / velocity) : null;
    const status: "out" | "low" | "in" = qty <= 0 ? "out" : qty <= min ? "low" : "in";
    if (status === "out") outOfStock += 1;
    const critical = qty <= 0 || (daysRemaining !== null && daysRemaining <= 2) || (velocity > 0 && qty <= velocity * 1.5);
    // Cover ~14 days (or top up to reorder point), whichever is larger.
    const target = Math.max(Math.ceil(velocity * 14), p.reorder_point ?? min ?? 0);
    const recommendedReorder = Math.max(0, target - qty);
    const row: LowStock = { name: p.name, sku: p.sku, warehouse: whOf(p), qty, minStock: min, avgDailySales: velocity, daysRemaining, recommendedReorder, supplier: null };
    if (status !== "in") { lowCount += 1; lowList.push(row); }
    if (critical) { criticalCount += 1; critList.push(row); }
  }
  lowList.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
  critList.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
  const reorderRecommendations = lowList.filter((r) => r.recommendedReorder > 0).slice(0, 10);

  // ---- Receivables (all open unpaid in last 90d, by customer) ----
  const recByCust = new Map<string, { outstanding: number; orders: number; oldest: string }>();
  for (const o of recent) {
    if (!nonVoid(o.status)) continue;
    const due = dueOf(o);
    if (due <= 0.005) continue;
    const cname = o.customer_id ? (custName.get(o.customer_id) ?? "Customer not recorded") : "Customer not recorded";
    const r = recByCust.get(cname) ?? { outstanding: 0, orders: 0, oldest: o.created_at };
    r.outstanding += due; r.orders += 1; if (o.created_at < r.oldest) r.oldest = o.created_at;
    recByCust.set(cname, r);
  }
  const receivablesList: Receivable[] = Array.from(recByCust.entries())
    .map(([customerName, r]) => ({ customerName, outstanding: round(r.outstanding), orders: r.orders, oldestDueDays: daysBetween(r.oldest, now) }))
    .sort((a, b) => b.oldestDueDays - a.oldestDueDays).slice(0, 15);
  const receivablesTotal = round(Array.from(recByCust.values()).reduce((s, r) => s + r.outstanding, 0));

  // ---- Purchasing ----
  const pos = (poRes.data ?? []) as { total: number; status: string; created_at: string }[];
  const periodPos = pos.filter((p) => inPeriod(p.created_at));
  const purchasing = {
    purchases: round(periodPos.reduce((s, p) => s + p.total, 0)),
    purchaseOrders: periodPos.length,
    pendingOrders: pos.filter((p) => p.status === "draft" || p.status === "ordered" || p.status === "partial").length,
  };

  return {
    period: { type: period.type, label: period.label, start: period.startISO, end: period.endISO, timezone: tz },
    currency,
    sales: {
      total: salesTotal, orders, avgOrder: orders > 0 ? round(salesTotal / orders) : 0, discounts, tax,
      paidTotal: round(paidTotal), dueTotal: round(dueTotal), byPaymentMethod, topProducts,
      topCategory: topCategory ? { category: topCategory[0], revenue: round(topCategory[1]) } : null,
      prevTotal, changePct: pctChange(salesTotal, prevTotal),
    },
    payments: { collected, unpaid: round(dueTotal) },
    unpaidOrders: unpaidOrders.slice(0, 20),
    reversals,
    profit: { revenue, cogs: round(cogs), grossProfit, expenses: expTotal, netProfit, marginPct, prevNetProfit, changePct: pctChange(netProfit, prevNetProfit) },
    expenses: { total: expTotal, byCategory, largest },
    inventory: { totalSkus: products.length, inventoryValue: round(inventoryValue), outOfStock, critical: criticalCount, lowStock: lowCount },
    lowStockItems: lowList.slice(0, 20),
    criticalStock: critList.slice(0, 20),
    reorderRecommendations,
    receivables: { total: receivablesTotal, customers: receivablesList },
    purchasing,
    branchBreakdown,
  };
}
