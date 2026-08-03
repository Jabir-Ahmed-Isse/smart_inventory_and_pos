import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// ERP purchase workflow stages (mapped from the purchase_status enum).
// ---------------------------------------------------------------------------
export const WORKFLOW_STEPS = [
  { key: "rfq", label: "RFQ", icon: "request_quote" },
  { key: "order", label: "Ordered", icon: "shopping_cart" },
  { key: "approval", label: "Approved", icon: "verified" },
  { key: "receiving", label: "Receiving", icon: "local_shipping" },
  { key: "received", label: "Received", icon: "inventory" },
  { key: "invoice", label: "Invoiced", icon: "description" },
  { key: "payment", label: "Paid", icon: "payments" },
  { key: "done", label: "Completed", icon: "check_circle" },
] as const;

/** Which workflow step index a PO status currently sits at. */
export function stageIndex(status: string): number {
  switch (status) {
    case "draft": return 0; // RFQ / draft
    case "pending": return 2; // ordered + awaiting/approved
    case "partial": return 3; // receiving
    case "received": return 4; // received (then invoice/payment beyond current data)
    case "overdue": return 3;
    case "cancelled": return -1;
    default: return 1;
  }
}

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  draft: { label: "Draft", cls: "bg-surface-container-high text-on-surface-variant border border-outline-variant", dot: "bg-on-surface-variant" },
  pending: { label: "Approved / Ordered", cls: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30", dot: "bg-tertiary" },
  partial: { label: "Partially Received", cls: "bg-secondary-container/20 text-secondary border border-secondary-container/30", dot: "bg-secondary" },
  received: { label: "Received", cls: "bg-primary-container/20 text-primary border border-primary/20", dot: "bg-primary" },
  overdue: { label: "Overdue", cls: "bg-error-container/30 text-error border border-error-container/40", dot: "bg-error" },
  cancelled: { label: "Cancelled", cls: "bg-surface-variant text-on-surface-variant border border-outline-variant", dot: "bg-outline" },
};

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}
function monthKey(iso: string) { return iso.slice(0, 7); }
function lastMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, label: m.toLocaleDateString("en-US", { month: "short" }) });
  }
  return out;
}

async function profileNames(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  const clean = [...new Set(ids.filter(Boolean))];
  if (!clean.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", clean);
  return new Map((data ?? []).map((p) => [p.id, p.full_name ?? "Buyer"] as const));
}

// ---------------------------------------------------------------------------
export type PORow = {
  id: string;
  poNumber: string;
  supplier: string;
  warehouse: string;
  status: string;
  total: number;
  created: string;
  expected: string;
  buyer: string;
  buyerInitials: string;
};

async function loadPOs(orgId: string): Promise<PORow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, po_number, total, status, created_at, expected_date, user_id, suppliers(name), warehouses(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string; po_number: string; total: number; status: string; created_at: string; expected_date: string | null; user_id: string | null;
    suppliers: { name: string } | null; warehouses: { name: string } | null;
  }[];
  const names = await profileNames(supabase, rows.map((r) => r.user_id ?? ""));

  return rows.map((r) => {
    const buyer = r.user_id ? names.get(r.user_id) ?? "Buyer" : "System";
    return {
      id: r.id, poNumber: r.po_number, supplier: r.suppliers?.name ?? "Unassigned", warehouse: r.warehouses?.name ?? "—",
      status: r.status, total: r.total, created: fmtDate(r.created_at), expected: fmtDate(r.expected_date),
      buyer, buyerInitials: buyer.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    };
  });
}

export async function getPurchaseOrders(orgId: string) {
  return loadPOs(orgId);
}

// ---------------------------------------------------------------------------
// Overview KPIs + charts + activities.
// ---------------------------------------------------------------------------
export async function getPurchasingOverview(orgId: string) {
  const supabase = await createClient();
  const [pos, suppliersRes, movementsRes] = await Promise.all([
    loadPOs(orgId),
    supabase.from("suppliers").select("id, name").eq("organization_id", orgId),
    supabase.from("stock_movements").select("id, type, quantity, created_at, products(name), warehouses(name), user_id").eq("organization_id", orgId).eq("type", "receiving").order("created_at", { ascending: false }).limit(200),
  ]);

  const live = pos.filter((p) => p.status !== "cancelled");
  const suppliers = suppliersRes.data ?? [];
  const openStatuses = ["draft", "pending", "overdue", "partial"];

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const receivingRaw = (movementsRes.data ?? []) as unknown as { id: string; quantity: number; created_at: string; products: { name: string } | null; warehouses: { name: string } | null; user_id: string | null }[];
  const names = await profileNames(supabase, receivingRaw.map((m) => m.user_id ?? ""));
  const receivingActivities = receivingRaw.slice(0, 8).map((m) => ({
    id: m.id, product: m.products?.name ?? "—", warehouse: m.warehouses?.name ?? "—", qty: m.quantity,
    by: m.user_id ? names.get(m.user_id) ?? "User" : "System", date: fmtDate(m.created_at),
  }));
  const receivedToday = receivingRaw.filter((m) => new Date(m.created_at) >= startToday).reduce((s, m) => s + m.quantity, 0);

  // Purchase spend by month (12) — from a light totals query.
  const { data: rawTotals } = await supabase.from("purchase_orders").select("total, status, created_at").eq("organization_id", orgId);
  const spendByMonth = lastMonths(12).map((m) => ({
    label: m.label,
    value: (rawTotals ?? []).filter((r) => r.status !== "cancelled" && monthKey(r.created_at) === m.key).reduce((s, r) => s + r.total, 0),
  }));

  // Supplier spend ranking.
  const supSpend = new Map<string, number>();
  for (const p of live) supSpend.set(p.supplier, (supSpend.get(p.supplier) ?? 0) + p.total);
  const supplierRanking = [...supSpend.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const totalValue = live.reduce((s, p) => s + p.total, 0);
  const outstanding = live.filter((p) => openStatuses.includes(p.status));

  return {
    pos,
    kpis: {
      totalOrders: pos.length,
      pending: pos.filter((p) => p.status === "draft" || p.status === "pending").length,
      approved: pos.filter((p) => ["pending", "partial", "received", "overdue"].includes(p.status)).length,
      receivedToday,
      activeSuppliers: suppliers.length,
      outstandingValue: outstanding.reduce((s, p) => s + p.total, 0),
      totalValue,
      avgOrderValue: live.length ? totalValue / live.length : 0,
    },
    spendByMonth,
    supplierRanking,
    statusCounts: {
      draft: pos.filter((p) => p.status === "draft").length,
      pending: pos.filter((p) => p.status === "pending").length,
      partial: pos.filter((p) => p.status === "partial").length,
      received: pos.filter((p) => p.status === "received").length,
    },
    receivingActivities,
    recentPOs: pos.slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
// Single PO detail with line items.
// ---------------------------------------------------------------------------
export async function getPurchaseOrderDetail(orgId: string, id: string) {
  const supabase = await createClient();
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, po_number, total, status, created_at, updated_at, expected_date, user_id, suppliers(name, contact_name, email, phone, payment_terms), warehouses(name, location)")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!po) return null;

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("quantity, unit_cost, products(name, sku)")
    .eq("organization_id", orgId)
    .eq("purchase_order_id", id);

  const names = await profileNames(supabase, [(po as { user_id: string | null }).user_id ?? ""]);
  const p = po as unknown as {
    id: string; po_number: string; total: number; status: string; created_at: string; updated_at: string; expected_date: string | null; user_id: string | null;
    suppliers: { name: string; contact_name: string | null; email: string | null; phone: string | null; payment_terms: string | null } | null;
    warehouses: { name: string; location: string | null } | null;
  };

  return {
    id: p.id, poNumber: p.po_number, total: p.total, status: p.status,
    created: fmtDate(p.created_at), updated: fmtDate(p.updated_at), expected: fmtDate(p.expected_date),
    buyer: p.user_id ? names.get(p.user_id) ?? "Buyer" : "System",
    supplier: p.suppliers, warehouse: p.warehouses,
    items: ((items ?? []) as unknown as { quantity: number; unit_cost: number; products: { name: string; sku: string } | null }[]).map((i) => ({
      name: i.products?.name ?? "—", sku: i.products?.sku ?? "—", qty: i.quantity, unitCost: i.unit_cost, lineTotal: i.quantity * i.unit_cost,
    })),
  };
}
