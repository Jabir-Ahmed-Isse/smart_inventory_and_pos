import type { SupabaseClient } from "@supabase/supabase-js";

type Adjust = { productId: string; deduct: number };

/**
 * Applies inventory changes for a set of products in a FEW round-trips instead
 * of one-per-product (the old loop did ~3 sequential queries per line, which is
 * why Complete/Hold felt slow). `deduct` > 0 removes stock (a sale); `deduct` < 0
 * returns stock (a cancel/return). Picks each product's highest-quantity level.
 *
 * Round-trips: 1 read (all levels) + N parallel updates + 1 batched movement insert.
 */
export async function applyStockMovements(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lines: Adjust[],
  type: "sale" | "return" | "adjustment",
  reference: string,
  branchId?: string | null,
): Promise<void> {
  const ids = Array.from(new Set(lines.map((l) => l.productId)));
  if (ids.length === 0) return;

  // When a branch is in context, deduct only from THAT branch's warehouses, so a
  // branch-scoped cashier never draws down another branch's stock (and the write
  // passes branch RLS). No branch → org-wide behaviour, unchanged.
  let branchWarehouses: Set<string> | null = null;
  if (branchId) {
    const { data: whs } = await supabase.from("warehouses").select("id").eq("organization_id", orgId).eq("branch_id", branchId);
    branchWarehouses = new Set(((whs ?? []) as { id: string }[]).map((w) => w.id));
  }

  const { data: levels } = await supabase
    .from("inventory_levels")
    .select("id, product_id, warehouse_id, quantity")
    .eq("organization_id", orgId)
    .in("product_id", ids)
    .order("quantity", { ascending: false });

  // Highest-quantity level per product (first, since ordered desc), restricted to
  // the branch's warehouses when a branch is in context.
  const best = new Map<string, { id: string; warehouse_id: string; quantity: number }>();
  for (const l of (levels ?? []) as { id: string; product_id: string; warehouse_id: string; quantity: number }[]) {
    if (branchWarehouses && !branchWarehouses.has(l.warehouse_id)) continue;
    if (!best.has(l.product_id)) best.set(l.product_id, { id: l.id, warehouse_id: l.warehouse_id, quantity: l.quantity });
  }

  const updates: PromiseLike<unknown>[] = [];
  const movements: Record<string, unknown>[] = [];
  for (const line of lines) {
    if (line.deduct === 0) continue;
    const lvl = best.get(line.productId);
    if (!lvl) continue;
    updates.push(
      supabase.from("inventory_levels").update({ quantity: Math.max(0, lvl.quantity - line.deduct) }).eq("id", lvl.id),
    );
    movements.push({
      organization_id: orgId,
      product_id: line.productId,
      warehouse_id: lvl.warehouse_id,
      type,
      quantity: -line.deduct,
      reference,
      user_id: userId,
      ...(branchId ? { branch_id: branchId } : {}),
    });
  }

  await Promise.all(updates);
  if (movements.length) await supabase.from("stock_movements").insert(movements as never);
}
