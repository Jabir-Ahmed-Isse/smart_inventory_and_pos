"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type CheckoutItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string };

type PayMethod = "cash" | "card" | "mobile" | "credit";

/**
 * Records a completed POS sale for the signed-in user's org:
 *  1. sales_order + sales_order_items
 *  2. decrements inventory_levels (from the warehouse with most stock)
 *  3. logs a "sale" stock_movement per line
 *  4. posts the revenue as a finance transaction
 * All tenant-scoped by RLS.
 */
export async function checkout(
  items: CheckoutItem[],
  paymentMethod: PayMethod,
): Promise<CheckoutResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const clean = items.filter((i) => i.quantity > 0);
  if (clean.length === 0) return { ok: false, error: "Cart is empty." };

  const supabase = await createClient();

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("tax_rate")
    .eq("id", org.orgId)
    .maybeSingle();
  const taxRate = orgRow?.tax_rate ?? 0;

  const subtotal = clean.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const orderNumber = `ORD-${Date.now().toString().slice(-9)}`;

  const { data: order, error: orderErr } = await supabase
    .from("sales_orders")
    .insert({
      organization_id: org.orgId,
      order_number: orderNumber,
      // Paid orders are completed; a due (credit) order is "processing" until settled.
      status: paymentMethod === "credit" ? "processing" : "completed",
      subtotal,
      tax,
      total,
      payment_method: paymentMethod,
      user_id: org.userId,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message ?? "Could not create the order." };
  }

  const { error: itemsErr } = await supabase.from("sales_order_items").insert(
    clean.map((i) => ({
      organization_id: org.orgId,
      sales_order_id: order.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: Math.round(i.unitPrice * i.quantity * 100) / 100,
    })),
  );
  if (itemsErr) return { ok: false, error: itemsErr.message };

  // Decrement inventory + record a sale movement for each line.
  for (const i of clean) {
    const { data: levels } = await supabase
      .from("inventory_levels")
      .select("id, warehouse_id, quantity")
      .eq("organization_id", org.orgId)
      .eq("product_id", i.productId)
      .gt("quantity", 0)
      .order("quantity", { ascending: false })
      .limit(1);

    const level = levels?.[0];
    if (level) {
      await supabase
        .from("inventory_levels")
        .update({ quantity: Math.max(0, level.quantity - i.quantity) })
        .eq("id", level.id);

      await supabase.from("stock_movements").insert({
        organization_id: org.orgId,
        product_id: i.productId,
        warehouse_id: level.warehouse_id,
        type: "sale",
        quantity: -i.quantity,
        reference: orderNumber,
        user_id: org.userId,
      });
    }
  }

  // Post revenue to finance — only for paid orders. A "credit" (due) order is
  // an unpaid sale: stock leaves and the order is recorded, but no cash is
  // counted until it's settled, so we skip the income transaction.
  if (paymentMethod !== "credit") {
    await supabase.from("transactions").insert({
      organization_id: org.orgId,
      type: "income",
      category: "Sales Revenue",
      description: `POS sale ${orderNumber}`,
      amount: total,
      reference: orderNumber,
      user_id: org.userId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/finance");
  revalidatePath("/pos");
  revalidatePath("/orders");

  return { ok: true, orderNumber, total };
}

export type PayResult = { ok: true } | { ok: false; error: string };

/**
 * Settles a due (credit) order: marks it completed and posts the deferred
 * income to finance. Guarded so an already-settled order can't be paid twice.
 */
export async function markSalePaid(orderId: string, orderNumber: string): Promise<PayResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const supabase = await createClient();

  // Read the order and check for an existing income record in parallel.
  const [orderRes, incomeRes] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("id, order_number, total, status")
      .eq("organization_id", org.orgId)
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id")
      .eq("organization_id", org.orgId)
      .eq("type", "income")
      .eq("reference", orderNumber)
      .limit(1),
  ]);

  const order = orderRes.data;
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled" || order.status === "refunded") {
    return { ok: false, error: `Cannot settle a ${order.status} order.` };
  }
  // "Paid" = an income transaction exists (source of truth), so no double-pay.
  if ((incomeRes.data ?? []).length > 0) {
    return { ok: false, error: "This order is already paid." };
  }

  // The two writes are independent — run them together.
  const [updRes, txRes] = await Promise.all([
    supabase
      .from("sales_orders")
      .update({ status: "completed" })
      .eq("organization_id", org.orgId)
      .eq("id", orderId),
    supabase.from("transactions").insert({
      organization_id: org.orgId,
      type: "income",
      category: "Sales Revenue",
      description: `Payment received — ${order.order_number}`,
      amount: order.total,
      reference: order.order_number,
      user_id: org.userId,
    }),
  ]);
  if (updRes.error) return { ok: false, error: updRes.error.message };
  if (txRes.error) return { ok: false, error: txRes.error.message };

  revalidatePath("/orders");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}
