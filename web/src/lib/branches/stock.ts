import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Cross-branch stock availability matrix. Powered by the org_branch_stock()
// SECURITY DEFINER function so it spans all branches (read-only) for a member of
// the org. Migration-safe: returns empty if the function/tables aren't there.
// ---------------------------------------------------------------------------

export type BranchCol = { id: string; name: string };
export type StockRow = {
  productId: string;
  name: string;
  sku: string;
  minStock: number;
  cells: Record<string, number>; // branchId -> qty
  total: number;
};
export type BranchStockMatrix = { branches: BranchCol[]; rows: StockRow[] };

type Raw = { product_id: string; product_name: string; sku: string; min_stock: number; branch_id: string; branch_name: string; qty: number };

export async function getOrgBranchStock(orgId: string): Promise<BranchStockMatrix> {
  try {
    const sb = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await sb.rpc("org_branch_stock", { p_org: orgId });
    if (error) return { branches: [], rows: [] };
    const raw = (data ?? []) as Raw[];

    const branchMap = new Map<string, string>();
    const rowMap = new Map<string, StockRow>();
    for (const r of raw) {
      branchMap.set(r.branch_id, r.branch_name);
      let row = rowMap.get(r.product_id);
      if (!row) {
        row = { productId: r.product_id, name: r.product_name, sku: r.sku, minStock: r.min_stock ?? 0, cells: {}, total: 0 };
        rowMap.set(r.product_id, row);
      }
      const q = Number(r.qty) || 0;
      row.cells[r.branch_id] = q;
      row.total += q;
    }

    const branches = Array.from(branchMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    const rows = Array.from(rowMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { branches, rows };
  } catch {
    return { branches: [], rows: [] };
  }
}
