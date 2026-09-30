import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ActiveOrg } from "@/lib/org";
import { getUserBranches } from "./data";

// ---------------------------------------------------------------------------
// Per-branch performance comparison. Aggregates the org's live data by branch,
// scoped to the branches the user may see (RLS also filters, so a branch-scoped
// user only ever gets their own branch's numbers). Definitions mirror the
// Finance module: sales = completed/processing order totals; collected = income
// transactions; unpaid = sales − collected; net = sales − COGS − expenses.
// ---------------------------------------------------------------------------

export type BranchStat = {
  branchId: string;
  name: string;
  code: string;
  sales: number;
  orders: number;
  collected: number;
  unpaid: number;
  expenses: number;
  cogs: number;
  netProfit: number;
  inventoryValue: number;
  lowStock: number;
};

const SALE_STATUSES = new Set(["completed", "processing"]);

export async function getBranchComparison(org: ActiveOrg): Promise<BranchStat[]> {
  const branches = await getUserBranches(org);
  if (branches.length === 0) return [];
  const sb = (await createClient()) as unknown as SupabaseClient;
  const orgId = org.orgId;

  const stat = new Map<string, BranchStat>();
  for (const b of branches) {
    stat.set(b.id, {
      branchId: b.id, name: b.name, code: b.code,
      sales: 0, orders: 0, collected: 0, unpaid: 0, expenses: 0, cogs: 0, netProfit: 0, inventoryValue: 0, lowStock: 0,
    });
  }

  const [soRes, txRes, itemRes, invRes] = await Promise.all([
    sb.from("sales_orders").select("total, status, branch_id").eq("organization_id", orgId),
    sb.from("transactions").select("type, amount, branch_id").eq("organization_id", orgId),
    sb.from("sales_order_items").select("quantity, products(cost_price), sales_orders(status, branch_id)").eq("organization_id", orgId),
    sb.from("inventory_levels").select("quantity, products(min_stock, cost_price), warehouses(branch_id)").eq("organization_id", orgId),
  ]);

  for (const r of (soRes.data ?? []) as { total: number; status: string; branch_id: string | null }[]) {
    const s = r.branch_id ? stat.get(r.branch_id) : undefined;
    if (s && SALE_STATUSES.has(r.status)) { s.sales += Number(r.total) || 0; s.orders += 1; }
  }

  for (const r of (txRes.data ?? []) as { type: string; amount: number; branch_id: string | null }[]) {
    const s = r.branch_id ? stat.get(r.branch_id) : undefined;
    if (!s) continue;
    if (r.type === "income") s.collected += Number(r.amount) || 0;
    else if (r.type === "expense") s.expenses += Number(r.amount) || 0;
  }

  for (const r of (itemRes.data ?? []) as unknown as { quantity: number; products: { cost_price: number } | null; sales_orders: { status: string; branch_id: string | null } | null }[]) {
    const so = r.sales_orders;
    if (!so || so.status === "cancelled" || so.status === "refunded") continue;
    const s = so.branch_id ? stat.get(so.branch_id) : undefined;
    if (s) s.cogs += (Number(r.quantity) || 0) * (Number(r.products?.cost_price) || 0);
  }

  // Inventory value + low-stock per branch. Low-stock counts inventory rows in
  // the branch's warehouses that sit at/under their product's min_stock (min>0).
  for (const r of (invRes.data ?? []) as unknown as { quantity: number; products: { min_stock: number; cost_price: number } | null; warehouses: { branch_id: string | null } | null }[]) {
    const bid = r.warehouses?.branch_id ?? null;
    const s = bid ? stat.get(bid) : undefined;
    if (!s) continue;
    const qty = Number(r.quantity) || 0;
    const min = Number(r.products?.min_stock) || 0;
    s.inventoryValue += qty * (Number(r.products?.cost_price) || 0);
    if (min > 0 && qty <= min) s.lowStock += 1;
  }

  for (const s of stat.values()) {
    s.unpaid = Math.max(0, Math.round((s.sales - s.collected) * 100) / 100);
    s.netProfit = Math.round((s.sales - s.cogs - s.expenses) * 100) / 100;
    s.sales = Math.round(s.sales * 100) / 100;
    s.collected = Math.round(s.collected * 100) / 100;
    s.expenses = Math.round(s.expenses * 100) / 100;
    s.cogs = Math.round(s.cogs * 100) / 100;
    s.inventoryValue = Math.round(s.inventoryValue * 100) / 100;
  }

  return Array.from(stat.values()).sort((a, b) => b.sales - a.sales);
}
