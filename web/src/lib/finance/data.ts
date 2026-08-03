import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Raw load — one round of parallel queries powers every finance page.
// ---------------------------------------------------------------------------
export type FinTxn = {
  id: string;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number;
  reference: string | null;
  createdAt: string;
};
export type FinSalesOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
  customerName: string;
  paid: boolean;
};
export type FinPurchaseOrder = {
  id: string;
  poNumber: string;
  total: number;
  status: string;
  createdAt: string;
  supplierName: string;
};

export type FinanceRaw = {
  transactions: FinTxn[];
  salesOrders: FinSalesOrder[];
  purchaseOrders: FinPurchaseOrder[];
  cogs: number;
};

export async function loadFinance(orgId: string): Promise<FinanceRaw> {
  const supabase = await createClient();
  const [txRes, soRes, poRes, itemRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, category, description, amount, reference, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_orders")
      .select("id, order_number, total, status, payment_method, created_at, customers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("id, po_number, total, status, created_at, suppliers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_order_items")
      .select("quantity, products(cost_price), sales_orders(status)")
      .eq("organization_id", orgId),
  ]);

  const transactions: FinTxn[] = (txRes.data ?? []).map((t) => ({
    id: t.id,
    type: t.type as "income" | "expense",
    category: t.category,
    description: t.description,
    amount: t.amount,
    reference: t.reference,
    createdAt: t.created_at,
  }));

  const paidRefs = new Set(
    transactions.filter((t) => t.type === "income" && t.reference).map((t) => t.reference as string),
  );

  const salesOrders: FinSalesOrder[] = ((soRes.data ?? []) as unknown as {
    id: string;
    order_number: string;
    total: number;
    status: string;
    payment_method: string | null;
    created_at: string;
    customers: { name: string } | null;
  }[]).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    total: o.total,
    status: o.status,
    paymentMethod: o.payment_method,
    createdAt: o.created_at,
    customerName: o.customers?.name ?? "Walk-in",
    paid: paidRefs.has(o.order_number),
  }));

  const purchaseOrders: FinPurchaseOrder[] = ((poRes.data ?? []) as unknown as {
    id: string;
    po_number: string;
    total: number;
    status: string;
    created_at: string;
    suppliers: { name: string } | null;
  }[]).map((p) => ({
    id: p.id,
    poNumber: p.po_number,
    total: p.total,
    status: p.status,
    createdAt: p.created_at,
    supplierName: p.suppliers?.name ?? "Unassigned",
  }));

  const items = (itemRes.data ?? []) as unknown as {
    quantity: number;
    products: { cost_price: number } | null;
    sales_orders: { status: string } | null;
  }[];
  const cogs = items
    .filter((i) => i.sales_orders?.status !== "cancelled")
    .reduce((s, i) => s + (i.quantity ?? 0) * (i.products?.cost_price ?? 0), 0);

  return { transactions, salesOrders, purchaseOrders, cogs };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}
export function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
      label: m.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return out;
}
function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Derived views (pure functions over FinanceRaw)
// ---------------------------------------------------------------------------
export type FinanceSummary = {
  revenue: number;
  expenses: number;
  netProfit: number;
  cashBalance: number;
  receivables: number;
  payables: number;
  months: { label: string; income: number; expense: number }[];
  cashFlow: { label: string; net: number; cumulative: number }[];
  expenseBreakdown: { category: string; amount: number; pct: number }[];
  incomeSources: { category: string; amount: number; pct: number }[];
  recent: FinTxn[];
};

const RESTOCK_CATEGORIES = ["Inventory Restock"];

export function financeSummary(raw: FinanceRaw): FinanceSummary {
  const income = raw.transactions.filter((t) => t.type === "income");
  const expense = raw.transactions.filter((t) => t.type === "expense");
  const revenue = income.reduce((s, t) => s + t.amount, 0);
  const expenses = expense.reduce((s, t) => s + t.amount, 0);

  const months = lastMonths(6).map((m) => ({
    label: m.label,
    income: income.filter((t) => monthKey(t.createdAt) === m.key).reduce((s, t) => s + t.amount, 0),
    expense: expense.filter((t) => monthKey(t.createdAt) === m.key).reduce((s, t) => s + t.amount, 0),
  }));

  let cum = 0;
  const cashFlow = months.map((m) => {
    const net = m.income - m.expense;
    cum += net;
    return { label: m.label, net, cumulative: cum };
  });

  const byCat = (rows: FinTxn[], total: number) => {
    const map = new Map<string, number>();
    for (const t of rows) map.set(t.category ?? "Other", (map.get(t.category ?? "Other") ?? 0) + t.amount);
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Receivables = unpaid, non-cancelled sales orders. Payables = open POs.
  const receivables = raw.salesOrders
    .filter((o) => !o.paid && o.status !== "cancelled" && o.status !== "refunded")
    .reduce((s, o) => s + o.total, 0);
  const payables = raw.purchaseOrders
    .filter((p) => ["draft", "pending", "overdue", "partial"].includes(p.status))
    .reduce((s, p) => s + p.total, 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    cashBalance: revenue - expenses,
    receivables,
    payables,
    months,
    cashFlow,
    expenseBreakdown: byCat(expense, expenses).slice(0, 6),
    incomeSources: byCat(income, revenue).slice(0, 6),
    recent: raw.transactions.slice(0, 8),
  };
}

export type ProfitLoss = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  opex: number;
  operatingProfit: number;
  netProfit: number;
  netMargin: number;
  opexByCategory: { category: string; amount: number }[];
  months: { label: string; revenue: number; cogs: number; net: number }[];
};

export function profitLoss(raw: FinanceRaw): ProfitLoss {
  // Accrual: revenue = all non-cancelled sales orders (incl. due).
  const soldOrders = raw.salesOrders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const revenue = soldOrders.reduce((s, o) => s + o.total, 0);
  const cogs = raw.cogs;
  const grossProfit = revenue - cogs;

  const opexTxns = raw.transactions.filter(
    (t) => t.type === "expense" && !RESTOCK_CATEGORIES.includes(t.category ?? ""),
  );
  const opex = opexTxns.reduce((s, t) => s + t.amount, 0);

  const opexMap = new Map<string, number>();
  for (const t of opexTxns) opexMap.set(t.category ?? "Other", (opexMap.get(t.category ?? "Other") ?? 0) + t.amount);

  const months = lastMonths(6).map((m) => {
    const rev = soldOrders.filter((o) => monthKey(o.createdAt) === m.key).reduce((s, o) => s + o.total, 0);
    const mCogs = rev > 0 && revenue > 0 ? (cogs * rev) / revenue : 0; // proportional estimate
    const mOpex = opexTxns.filter((t) => monthKey(t.createdAt) === m.key).reduce((s, t) => s + t.amount, 0);
    return { label: m.label, revenue: rev, cogs: mCogs, net: rev - mCogs - mOpex };
  });

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    opex,
    operatingProfit: grossProfit - opex,
    netProfit: grossProfit - opex,
    netMargin: revenue > 0 ? ((grossProfit - opex) / revenue) * 100 : 0,
    opexByCategory: [...opexMap.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    months,
  };
}

// Receivables / Payables with aging buckets
export type AgingRow = {
  id: string;
  ref: string;
  party: string;
  amount: number;
  date: string;
  days: number;
  bucket: "current" | "30" | "60" | "90+";
};
function bucketOf(days: number): AgingRow["bucket"] {
  if (days <= 30) return "current";
  if (days <= 60) return "30";
  if (days <= 90) return "60";
  return "90+";
}
export function receivables(raw: FinanceRaw): AgingRow[] {
  return raw.salesOrders
    .filter((o) => !o.paid && o.status !== "cancelled" && o.status !== "refunded")
    .map((o) => {
      const days = daysAgo(o.createdAt);
      return { id: o.id, ref: o.orderNumber, party: o.customerName, amount: o.total, date: fmtDate(o.createdAt), days, bucket: bucketOf(days) };
    });
}
export function payables(raw: FinanceRaw): AgingRow[] {
  return raw.purchaseOrders
    .filter((p) => ["draft", "pending", "overdue", "partial"].includes(p.status))
    .map((p) => {
      const days = daysAgo(p.createdAt);
      return { id: p.id, ref: p.poNumber, party: p.supplierName, amount: p.total, date: fmtDate(p.createdAt), days, bucket: bucketOf(days) };
    });
}

// Income & expense analytics
export function incomeAnalytics(raw: FinanceRaw) {
  const income = raw.transactions.filter((t) => t.type === "income");
  const total = income.reduce((s, t) => s + t.amount, 0);
  const within = (d: number) => income.filter((t) => daysAgo(t.createdAt) < d).reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, number>();
  for (const t of income) map.set(t.category ?? "Other", (map.get(t.category ?? "Other") ?? 0) + t.amount);
  return {
    total,
    today: within(1),
    week: within(7),
    month: within(30),
    months: lastMonths(6).map((m) => ({ label: m.label, amount: income.filter((t) => monthKey(t.createdAt) === m.key).reduce((s, t) => s + t.amount, 0) })),
    sources: [...map.entries()].map(([category, amount]) => ({ category, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount),
    recent: income.slice(0, 10),
  };
}
export function expenseAnalytics(raw: FinanceRaw) {
  const expense = raw.transactions.filter((t) => t.type === "expense");
  const total = expense.reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, number>();
  for (const t of expense) map.set(t.category ?? "Other", (map.get(t.category ?? "Other") ?? 0) + t.amount);
  const months = lastMonths(6).map((m) => ({ label: m.label, amount: expense.filter((t) => monthKey(t.createdAt) === m.key).reduce((s, t) => s + t.amount, 0) }));
  const thisM = months[months.length - 1]?.amount ?? 0;
  const lastM = months[months.length - 2]?.amount ?? 0;
  return {
    total,
    thisMonth: thisM,
    lastMonth: lastM,
    change: lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : 0,
    categories: [...map.entries()].map(([category, amount]) => ({ category, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount),
    months,
    recent: expense.slice(0, 10),
  };
}

// Payments by method (from sales orders)
export function paymentsByMethod(raw: FinanceRaw) {
  const methods = ["cash", "card", "mobile", "credit"] as const;
  const paid = raw.salesOrders.filter((o) => o.paid);
  const byMethod = methods.map((m) => ({
    method: m,
    count: paid.filter((o) => o.paymentMethod === m).length,
    amount: paid.filter((o) => o.paymentMethod === m).reduce((s, o) => s + o.total, 0),
  }));
  return {
    byMethod,
    total: paid.reduce((s, o) => s + o.total, 0),
    history: raw.salesOrders.slice(0, 15),
  };
}
