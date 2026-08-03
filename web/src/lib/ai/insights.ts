import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// AI insights engine.
//
// Builds one comprehensive, deterministic snapshot of an org's live inventory,
// sales and finance state. This is the single source of truth for both the
// insight cards on /ai and the grounding context handed to Claude — every
// number the assistant cites is computed here from real Supabase data, so the
// AI can't hallucinate figures.
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

export type ReorderSuggestion = {
  id: string;
  name: string;
  sku: string;
  qty: number;
  reorderPoint: number;
  minStock: number;
  sold30: number;
  suggestedOrder: number;
  urgency: "out" | "critical" | "low";
  reason: string;
};

export type DeadStockItem = {
  id: string;
  name: string;
  sku: string;
  qty: number;
  value: number;
  daysSinceSale: number | null; // null = never sold
  note: string;
};

export type TopSeller = {
  id: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
};

export type AiSnapshot = {
  currency: string;
  generatedAt: string;
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
  customerCount: number;
  todaySales: { total: number; count: number };
  revenue7d: number;
  revenue30d: number;
  revenueTrend: number[]; // weekly revenue, oldest → newest (8 buckets)
  trendPct: number; // last week vs previous week, %
  income: number;
  expenses: number;
  net: number;
  reorder: ReorderSuggestion[];
  deadStock: DeadStockItem[];
  topSellers: TopSeller[];
  // Compact product list for LLM grounding (kept small).
  products: {
    name: string;
    sku: string;
    category: string;
    qty: number;
    price: number;
    status: "in" | "low" | "out";
    sold30: number;
  }[];
};

type RawProduct = {
  id: string;
  name: string;
  sku: string;
  retail_price: number;
  cost_price: number;
  min_stock: number;
  reorder_point: number;
  categories: { name: string } | null;
  inventory_levels: { quantity: number }[] | null;
};

type RawSaleItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  sales_orders: { created_at: string; status: string } | null;
};

type RawSalesOrder = { created_at: string; total: number; status: string };
type RawTxn = { type: "income" | "expense"; amount: number };

function emptySnapshot(currency: string): AiSnapshot {
  return {
    currency,
    generatedAt: new Date().toISOString(),
    productCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inventoryValue: 0,
    customerCount: 0,
    todaySales: { total: 0, count: 0 },
    revenue7d: 0,
    revenue30d: 0,
    revenueTrend: [0, 0, 0, 0, 0, 0, 0, 0],
    trendPct: 0,
    income: 0,
    expenses: 0,
    net: 0,
    reorder: [],
    deadStock: [],
    topSellers: [],
    products: [],
  };
}

export async function getAiSnapshot(
  orgId: string,
  currency = "USD",
): Promise<AiSnapshot> {
  const supabase = await createClient();
  const now = Date.now();

  const [prodRes, itemRes, orderRes, custRes, txnRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, retail_price, cost_price, min_stock, reorder_point, categories(name), inventory_levels(quantity)",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("sales_order_items")
      .select("product_id, quantity, unit_price, sales_orders(created_at, status)")
      .eq("organization_id", orgId),
    supabase
      .from("sales_orders")
      .select("created_at, total, status")
      .eq("organization_id", orgId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase.from("transactions").select("type, amount").eq("organization_id", orgId),
  ]);

  const products = (prodRes.data ?? []) as unknown as RawProduct[];
  const items = (itemRes.data ?? []) as unknown as RawSaleItem[];
  const orders = (orderRes.data ?? []) as unknown as RawSalesOrder[];
  const txns = (txnRes.data ?? []) as unknown as RawTxn[];

  if (products.length === 0) return { ...emptySnapshot(currency), customerCount: custRes.count ?? 0 };

  // Per-product sales aggregation from real order history.
  type Agg = { sold30: number; sold90: number; units: number; revenue: number; lastSale: number | null };
  const byProduct = new Map<string, Agg>();
  for (const it of items) {
    if (!it.product_id) continue;
    const so = it.sales_orders;
    if (so && so.status === "cancelled") continue;
    const ts = so?.created_at ? new Date(so.created_at).getTime() : null;
    const agg = byProduct.get(it.product_id) ?? {
      sold30: 0,
      sold90: 0,
      units: 0,
      revenue: 0,
      lastSale: null,
    };
    const qty = it.quantity ?? 0;
    agg.units += qty;
    agg.revenue += qty * (it.unit_price ?? 0);
    if (ts !== null) {
      if (now - ts <= 30 * DAY) agg.sold30 += qty;
      if (now - ts <= 90 * DAY) agg.sold90 += qty;
      if (agg.lastSale === null || ts > agg.lastSale) agg.lastSale = ts;
    }
    byProduct.set(it.product_id, agg);
  }

  let inventoryValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const reorder: ReorderSuggestion[] = [];
  const deadStock: DeadStockItem[] = [];
  const compact: AiSnapshot["products"] = [];

  for (const p of products) {
    const qty = (p.inventory_levels ?? []).reduce((s, l) => s + (l.quantity ?? 0), 0);
    const agg = byProduct.get(p.id);
    const sold30 = agg?.sold30 ?? 0;
    const sold90 = agg?.sold90 ?? 0;
    const price = p.retail_price ?? 0;
    inventoryValue += qty * price;

    const status: "in" | "low" | "out" =
      qty <= 0 ? "out" : qty <= p.min_stock ? "low" : "in";
    if (status === "low") lowStockCount++;
    if (status === "out") outOfStockCount++;

    compact.push({
      name: p.name,
      sku: p.sku,
      category: p.categories?.name ?? "—",
      qty,
      price,
      status,
      sold30,
    });

    // Smart reorder: qty at/under reorder point (or stock threshold).
    const trigger = p.reorder_point > 0 ? p.reorder_point : p.min_stock;
    if (qty <= trigger) {
      const target = Math.max(
        p.reorder_point > 0 ? p.reorder_point * 2 : p.min_stock * 3,
        sold30 * 2,
        5,
      );
      const suggestedOrder = Math.max(target - qty, Math.max(p.min_stock, 1));
      const urgency = qty <= 0 ? "out" : qty <= p.min_stock ? "critical" : "low";
      const reason =
        sold30 > 0
          ? `${sold30} sold in 30d · ${qty} on hand`
          : `${qty} on hand, at/under reorder point`;
      reorder.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        qty,
        reorderPoint: p.reorder_point,
        minStock: p.min_stock,
        sold30,
        suggestedOrder: Math.round(suggestedOrder),
        urgency,
        reason,
      });
    }

    // Dead stock: holding units with no sales in the last 90 days.
    if (qty > 0 && sold90 === 0) {
      const daysSinceSale =
        agg?.lastSale != null ? Math.floor((now - agg.lastSale) / DAY) : null;
      deadStock.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        qty,
        value: qty * price,
        daysSinceSale,
        note:
          daysSinceSale == null
            ? "No sales recorded"
            : `0 sales in 90 days (last: ${daysSinceSale}d ago)`,
      });
    }
  }

  // Rank: most urgent / highest velocity reorders first.
  const rank = { out: 0, critical: 1, low: 2 } as const;
  reorder.sort((a, b) => rank[a.urgency] - rank[b.urgency] || b.sold30 - a.sold30);
  // Highest tied-up value first.
  deadStock.sort((a, b) => b.value - a.value);

  // Top sellers by revenue (all-time from order history).
  const topSellers: TopSeller[] = products
    .map((p) => {
      const agg = byProduct.get(p.id);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitsSold: agg?.units ?? 0,
        revenue: agg?.revenue ?? 0,
      };
    })
    .filter((t) => t.unitsSold > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Revenue: today, 7d, 30d, and 8 weekly buckets for the trend sparkline.
  const active = orders.filter((o) => o.status !== "cancelled");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  let todayTotal = 0;
  let todayCount = 0;
  let revenue7d = 0;
  let revenue30d = 0;
  const weekly = new Array(8).fill(0) as number[];
  for (const o of active) {
    const ts = new Date(o.created_at).getTime();
    const t = o.total ?? 0;
    if (ts >= startOfToday.getTime()) {
      todayTotal += t;
      todayCount++;
    }
    const ageDays = (now - ts) / DAY;
    if (ageDays <= 7) revenue7d += t;
    if (ageDays <= 30) revenue30d += t;
    if (ageDays < 56) {
      const bucket = 7 - Math.floor(ageDays / 7); // 0 = oldest week, 7 = current
      if (bucket >= 0 && bucket < 8) weekly[bucket] += t;
    }
  }
  const lastWeek = weekly[7];
  const prevWeek = weekly[6];
  const trendPct =
    prevWeek > 0
      ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100)
      : lastWeek > 0
        ? 100
        : 0;

  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return {
    currency,
    generatedAt: new Date().toISOString(),
    productCount: products.length,
    lowStockCount,
    outOfStockCount,
    inventoryValue,
    customerCount: custRes.count ?? 0,
    todaySales: { total: todayTotal, count: todayCount },
    revenue7d,
    revenue30d,
    revenueTrend: weekly,
    trendPct,
    income,
    expenses,
    net: income - expenses,
    reorder: reorder.slice(0, 8),
    deadStock: deadStock.slice(0, 8),
    topSellers,
    products: compact,
  };
}

// ---------------------------------------------------------------------------
// Sparkline helper — turns a series into SVG line + area paths (viewBox 0 0 W H).
// ---------------------------------------------------------------------------
export function sparklinePath(
  values: number[],
  width = 400,
  height = 100,
): { line: string; area: string } {
  const n = values.length;
  if (n === 0) return { line: "", area: "" };
  const max = Math.max(...values, 1);
  const pad = 6;
  const stepX = n > 1 ? width / (n - 1) : width;
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - (v / max) * (height - pad * 2);
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area };
}
