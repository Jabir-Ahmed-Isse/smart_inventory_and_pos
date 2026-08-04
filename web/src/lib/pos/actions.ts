"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { canSettlePayments } from "@/lib/rbac";

export type CheckoutItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutResult =
  | { ok: true; orderNumber: string; total: number; due: boolean }
  | { ok: false; error: string };

type PayMethod = "cash" | "card" | "mobile" | "credit" | "bank";
type AccountKind = "bank" | "mobile" | "cash";

const methodForKind = (kind: AccountKind): PayMethod =>
  kind === "mobile" ? "mobile" : kind === "cash" ? "cash" : "bank";

/**
 * Records a POS sale for the signed-in user's org.
 *  - Staff (or no account selected) → a DUE order: stock leaves, no cash counted,
 *    settled later by a cashier/accountant.
 *  - A permitted role selecting an account → a PAID order routed into that account.
 * Then: sales_order + items, inventory decrement, "sale" movement per line, and
 * (for paid orders) an income transaction tagged with the account. RLS-scoped.
 */
export async function checkout(
  items: CheckoutItem[],
  accountId: string | null,
  customerId?: string | null,
): Promise<CheckoutResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const clean = items.filter((i) => i.quantity > 0);
  if (clean.length === 0) return { ok: false, error: "Cart is empty." };

  const supabase = await createClient();

  // Decide whether this is a paid or due sale, and validate the account.
  const canPay = canSettlePayments(org.role);
  let paymentMethod: PayMethod = "credit";
  let paidAccountId: string | null = null;
  if (canPay && accountId) {
    const { data: acc } = await supabase
      .from("payment_accounts")
      .select("id, kind, is_active")
      .eq("organization_id", org.orgId)
      .eq("id", accountId)
      .maybeSingle();
    if (!acc || !acc.is_active) return { ok: false, error: "That payment account is unavailable." };
    paidAccountId = acc.id;
    paymentMethod = methodForKind(acc.kind);
  }
  const isDue = paidAccountId === null;

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

  const orderPayload = {
    organization_id: org.orgId,
    order_number: orderNumber,
    // Paid orders are completed; a due order is "processing" until settled.
    status: (isDue ? "processing" : "completed") as "processing" | "completed",
    subtotal,
    tax,
    total,
    payment_method: paymentMethod,
    user_id: org.userId,
    // Only tag the account for a paid order, so a plain due sale still inserts
    // cleanly on a database where the account_id column isn't present yet.
    ...(paidAccountId ? { account_id: paidAccountId } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
  };

  const { data: order, error: orderErr } = await supabase
    .from("sales_orders")
    .insert(orderPayload)
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

  // Post revenue to finance — only for paid orders, tagged with the receiving
  // account. A due order is an unpaid sale: stock leaves and the order is
  // recorded, but no money is counted until a cashier settles it.
  if (!isDue) {
    await supabase.from("transactions").insert({
      organization_id: org.orgId,
      type: "income",
      category: "Sales Revenue",
      description: `POS sale ${orderNumber}`,
      amount: total,
      reference: orderNumber,
      account_id: paidAccountId,
      user_id: org.userId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/finance");
  revalidatePath("/pos");
  revalidatePath("/orders");

  return { ok: true, orderNumber, total, due: isDue };
}

export type PayResult = { ok: true } | { ok: false; error: string };

/**
 * Records a payment against a due order into a chosen account. Supports partial
 * payments: the amount is posted as income and, once cumulative payments cover
 * the order total, the order is marked completed. Only a cashier/accountant (or
 * an owner/admin/manager) may take payment — staff cannot.
 *
 * @param amount  the amount being paid now; omit/0 = pay the full remaining balance.
 */
export async function markSalePaid(
  orderId: string,
  orderNumber: string,
  accountId: string,
  amount?: number,
): Promise<PayResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!canSettlePayments(org.role)) {
    return { ok: false, error: "Only a cashier or accountant can take payments." };
  }
  if (!accountId) return { ok: false, error: "Choose the account the payment was received into." };

  const supabase = await createClient();

  // Read the order, verify the account, and total what's already been paid.
  const [orderRes, incomeRes, accRes] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("id, order_number, total, status")
      .eq("organization_id", org.orgId)
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount")
      .eq("organization_id", org.orgId)
      .eq("type", "income")
      .eq("reference", orderNumber),
    supabase
      .from("payment_accounts")
      .select("id, kind, is_active")
      .eq("organization_id", org.orgId)
      .eq("id", accountId)
      .maybeSingle(),
  ]);

  const order = orderRes.data;
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled" || order.status === "refunded") {
    return { ok: false, error: `Cannot settle a ${order.status} order.` };
  }
  const acc = accRes.data;
  if (!acc || !acc.is_active) return { ok: false, error: "That payment account is unavailable." };

  const alreadyPaid = (incomeRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const remaining = Math.round((order.total - alreadyPaid) * 100) / 100;
  if (remaining <= 0.005) return { ok: false, error: "This order is already fully paid." };

  // No amount (or over-payment) = settle the whole remaining balance.
  let pay = !amount || amount <= 0 ? remaining : Math.round(amount * 100) / 100;
  if (pay > remaining) pay = remaining;

  const fullyPaid = alreadyPaid + pay >= order.total - 0.005;

  const [updRes, txRes] = await Promise.all([
    supabase
      .from("sales_orders")
      // Complete only when the balance is cleared; always record the latest account used.
      .update({
        status: fullyPaid ? "completed" : "processing",
        account_id: acc.id,
        payment_method: methodForKind(acc.kind),
      })
      .eq("organization_id", org.orgId)
      .eq("id", orderId),
    supabase.from("transactions").insert({
      organization_id: org.orgId,
      type: "income",
      category: "Sales Revenue",
      description: `${fullyPaid ? "Payment received" : "Part payment"} — ${order.order_number}`,
      amount: pay,
      reference: order.order_number,
      account_id: acc.id,
      user_id: org.userId,
    }),
  ]);
  if (updRes.error) return { ok: false, error: updRes.error.message };
  if (txRes.error) return { ok: false, error: txRes.error.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}

/**
 * Form-action wrapper for markSalePaid. Using a real server action as the form
 * `action` makes revalidatePath auto-refresh the Orders list on success — the
 * reliable refresh path in this app (vs. a manual router.refresh()).
 */
export async function settleOrderAction(_prev: PayResult | null, formData: FormData): Promise<PayResult> {
  const orderId = String(formData.get("orderId") ?? "");
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : undefined;
  return markSalePaid(orderId, orderNumber, accountId, amount);
}
