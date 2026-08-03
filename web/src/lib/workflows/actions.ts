"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function currentLevel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  productId: string,
  warehouseId: string,
) {
  const { data } = await supabase
    .from("inventory_levels")
    .select("id, quantity")
    .eq("organization_id", orgId)
    .eq("product_id", productId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();
  return data;
}

async function setLevel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const existing = await currentLevel(supabase, orgId, productId, warehouseId);
  if (existing) {
    return supabase
      .from("inventory_levels")
      .update({ quantity: Math.max(0, quantity), updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
  return supabase.from("inventory_levels").insert({
    organization_id: orgId,
    product_id: productId,
    warehouse_id: warehouseId,
    quantity: Math.max(0, quantity),
  });
}

// ---------------------------------------------------------------------------
// Stocktake — reconcile a physical count to an adjustment movement
// ---------------------------------------------------------------------------
export async function recordStocktake(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const productId = String(formData.get("product_id") ?? "");
  const warehouseId = String(formData.get("warehouse_id") ?? "");
  const counted = parseInt(String(formData.get("counted") ?? ""), 10);
  if (!productId || !warehouseId) return { ok: false, error: "Select a product and warehouse." };
  if (!Number.isFinite(counted) || counted < 0) return { ok: false, error: "Enter a valid counted quantity." };

  const supabase = await createClient();
  const level = await currentLevel(supabase, org.orgId, productId, warehouseId);
  const before = level?.quantity ?? 0;
  const delta = counted - before;

  const { error: setErr } = await setLevel(supabase, org.orgId, productId, warehouseId, counted);
  if (setErr) return { ok: false, error: setErr.message };

  if (delta !== 0) {
    const { error: mvErr } = await supabase.from("stock_movements").insert({
      organization_id: org.orgId,
      product_id: productId,
      warehouse_id: warehouseId,
      type: "adjustment",
      quantity: delta,
      reference: `Stocktake (was ${before}, counted ${counted})`,
      user_id: org.userId,
    });
    if (mvErr) return { ok: false, error: mvErr.message };
  }

  revalidatePath("/stocktake");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/stock-movements");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Transfer — move stock between two warehouses
// ---------------------------------------------------------------------------
export async function transferStock(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const productId = String(formData.get("product_id") ?? "");
  const fromId = String(formData.get("from_warehouse_id") ?? "");
  const toId = String(formData.get("to_warehouse_id") ?? "");
  const qty = parseInt(String(formData.get("quantity") ?? ""), 10);

  if (!productId || !fromId || !toId) return { ok: false, error: "Select product, source and destination." };
  if (fromId === toId) return { ok: false, error: "Source and destination must differ." };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Enter a valid quantity." };

  const supabase = await createClient();
  const from = await currentLevel(supabase, org.orgId, productId, fromId);
  if (!from || from.quantity < qty) {
    return { ok: false, error: `Not enough stock at source (${from?.quantity ?? 0} available).` };
  }
  const to = await currentLevel(supabase, org.orgId, productId, toId);

  const ref = `TRF-${Date.now().toString().slice(-9)}`;

  const { error: e1 } = await setLevel(supabase, org.orgId, productId, fromId, from.quantity - qty);
  if (e1) return { ok: false, error: e1.message };
  const { error: e2 } = await setLevel(supabase, org.orgId, productId, toId, (to?.quantity ?? 0) + qty);
  if (e2) return { ok: false, error: e2.message };

  const { error: mvErr } = await supabase.from("stock_movements").insert([
    { organization_id: org.orgId, product_id: productId, warehouse_id: fromId, type: "transfer", quantity: -qty, reference: `${ref} (out)`, user_id: org.userId },
    { organization_id: org.orgId, product_id: productId, warehouse_id: toId, type: "transfer", quantity: qty, reference: `${ref} (in)`, user_id: org.userId },
  ]);
  if (mvErr) return { ok: false, error: mvErr.message };

  revalidatePath("/transfers");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/stock-movements");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Return — put stock back and record a refund
// ---------------------------------------------------------------------------
export async function recordReturn(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const productId = String(formData.get("product_id") ?? "");
  const warehouseId = String(formData.get("warehouse_id") ?? "");
  const qty = parseInt(String(formData.get("quantity") ?? ""), 10);
  const refund = parseFloat(String(formData.get("refund") ?? "0")) || 0;
  const reason = String(formData.get("reason") ?? "").trim() || "Customer return";

  if (!productId || !warehouseId) return { ok: false, error: "Select a product and warehouse." };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Enter a valid quantity." };

  const supabase = await createClient();
  const level = await currentLevel(supabase, org.orgId, productId, warehouseId);
  const ref = `RET-${Date.now().toString().slice(-9)}`;

  const { error: setErr } = await setLevel(supabase, org.orgId, productId, warehouseId, (level?.quantity ?? 0) + qty);
  if (setErr) return { ok: false, error: setErr.message };

  const { error: mvErr } = await supabase.from("stock_movements").insert({
    organization_id: org.orgId,
    product_id: productId,
    warehouse_id: warehouseId,
    type: "return",
    quantity: qty,
    reference: `${ref} — ${reason}`,
    user_id: org.userId,
  });
  if (mvErr) return { ok: false, error: mvErr.message };

  if (refund > 0) {
    const { error: txErr } = await supabase.from("transactions").insert({
      organization_id: org.orgId,
      type: "expense",
      category: "Refunds",
      description: `Return refund ${ref}`,
      amount: refund,
      reference: ref,
      user_id: org.userId,
    });
    if (txErr) return { ok: false, error: txErr.message };
  }

  revalidatePath("/sales/returns");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/finance");
  revalidatePath("/stock-movements");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Purchase return — send received goods back to a supplier (stock leaves)
// ---------------------------------------------------------------------------
export async function returnToSupplier(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const productId = String(formData.get("product_id") ?? "");
  const warehouseId = String(formData.get("warehouse_id") ?? "");
  const qty = parseInt(String(formData.get("quantity") ?? ""), 10);
  const reasonInput = String(formData.get("reason") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const reason = [reasonInput || "Returned to supplier", supplier && `→ ${supplier}`].filter(Boolean).join(" ");

  if (!productId || !warehouseId) return { ok: false, error: "Select a product and warehouse." };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Enter a valid quantity." };

  const supabase = await createClient();
  const level = await currentLevel(supabase, org.orgId, productId, warehouseId);
  if (!level || level.quantity < qty) {
    return { ok: false, error: `Not enough stock to return (${level?.quantity ?? 0} on hand).` };
  }

  const ref = `PRET-${Date.now().toString().slice(-9)}`;

  const { error: setErr } = await setLevel(supabase, org.orgId, productId, warehouseId, level.quantity - qty);
  if (setErr) return { ok: false, error: setErr.message };

  // No dedicated "purchase return" movement type in the enum yet — recorded as
  // an outbound adjustment tagged with a PRET- reference so it stays traceable.
  const { error: mvErr } = await supabase.from("stock_movements").insert({
    organization_id: org.orgId,
    product_id: productId,
    warehouse_id: warehouseId,
    type: "adjustment",
    quantity: -qty,
    reference: `${ref} — ${reason} (return to supplier)`,
    user_id: org.userId,
  });
  if (mvErr) return { ok: false, error: mvErr.message };

  revalidatePath("/purchases/returns");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/stock-movements");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// RFQ — create a draft purchase order (request for quote)
// ---------------------------------------------------------------------------
export async function createRfq(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const productId = String(formData.get("product_id") ?? "");
  const qty = parseInt(String(formData.get("quantity") ?? ""), 10);
  const unitCost = parseFloat(String(formData.get("unit_cost") ?? "0")) || 0;

  if (!productId) return { ok: false, error: "Select a product." };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Enter a valid quantity." };

  const supabase = await createClient();
  const poNumber = `RFQ-${Date.now().toString().slice(-9)}`;

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: org.orgId,
      po_number: poNumber,
      supplier_id: supplierId,
      status: "draft",
      total: Math.round(unitCost * qty * 100) / 100,
      user_id: org.userId,
    })
    .select("id")
    .single();
  if (poErr || !po) return { ok: false, error: poErr?.message ?? "Could not create the RFQ." };

  const { error: itemErr } = await supabase.from("purchase_order_items").insert({
    organization_id: org.orgId,
    purchase_order_id: po.id,
    product_id: productId,
    quantity: qty,
    unit_cost: unitCost,
  });
  if (itemErr) return { ok: false, error: itemErr.message };

  revalidatePath("/rfq");
  revalidatePath("/purchases");
  return { ok: true };
}
