"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ReceiveResult =
  | { ok: true; poNumber: string }
  | { ok: false; error: string };

/**
 * Receives stock into a warehouse: creates a received purchase order + item,
 * increments inventory, logs a "receiving" movement, and posts the cost as a
 * finance expense. The inventory-in counterpart to POS checkout.
 */
export async function receiveStock(formData: FormData): Promise<ReceiveResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const productId = String(formData.get("product_id") ?? "");
  const warehouseId = String(formData.get("warehouse_id") ?? "");
  const quantity = parseInt(String(formData.get("quantity") ?? "0"), 10) || 0;
  const unitCost = parseFloat(String(formData.get("unit_cost") ?? "0")) || 0;
  const supplierId = String(formData.get("supplier_id") ?? "") || null;

  if (!productId) return { ok: false, error: "Select a product." };
  if (!warehouseId) return { ok: false, error: "Select a warehouse." };
  if (quantity <= 0) return { ok: false, error: "Quantity must be greater than zero." };

  const supabase = await createClient();
  const poNumber = `PO-${Date.now().toString().slice(-9)}`;
  const total = Math.round(unitCost * quantity * 100) / 100;

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: org.orgId,
      po_number: poNumber,
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      status: "received",
      total,
      user_id: org.userId,
    })
    .select("id")
    .single();

  if (poErr || !po) return { ok: false, error: poErr?.message ?? "Could not create purchase order." };

  // Increment inventory (read current level, then write). Runs concurrently
  // with the other independent writes below.
  async function applyInventory(): Promise<string | null> {
    const { data: level } = await supabase
      .from("inventory_levels")
      .select("id, quantity")
      .eq("organization_id", org!.orgId)
      .eq("product_id", productId)
      .eq("warehouse_id", warehouseId)
      .maybeSingle();

    const res = level
      ? await supabase
          .from("inventory_levels")
          .update({ quantity: level.quantity + quantity })
          .eq("id", level.id)
      : await supabase.from("inventory_levels").insert({
          organization_id: org!.orgId,
          product_id: productId,
          warehouse_id: warehouseId,
          quantity,
        });
    return res.error?.message ?? null;
  }

  // Steps 2–5 are independent of each other, so fire them in parallel.
  const [itemRes, invErr, movementRes, txnRes] = await Promise.all([
    supabase.from("purchase_order_items").insert({
      organization_id: org.orgId,
      purchase_order_id: po.id,
      product_id: productId,
      quantity,
      unit_cost: unitCost,
    }),
    applyInventory(),
    supabase.from("stock_movements").insert({
      organization_id: org.orgId,
      product_id: productId,
      warehouse_id: warehouseId,
      type: "receiving",
      quantity,
      reference: poNumber,
      user_id: org.userId,
    }),
    total > 0
      ? supabase.from("transactions").insert({
          organization_id: org.orgId,
          type: "expense",
          category: "Inventory Restock",
          description: `Received ${quantity} units (${poNumber})`,
          amount: total,
          reference: poNumber,
          user_id: org.userId,
        })
      : Promise.resolve({ error: null }),
  ]);

  const writeError = itemRes.error?.message ?? invErr ?? movementRes.error?.message ?? txnRes.error?.message;
  if (writeError) return { ok: false, error: writeError };

  revalidatePath("/warehouse");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/purchases");
  revalidatePath("/stock-movements");
  return { ok: true, poNumber };
}
