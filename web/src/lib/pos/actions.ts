"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { canSettlePayments } from "@/lib/rbac";
import { resolveWriteBranchId } from "@/lib/branches/context";
import { getBranchStockMap } from "@/lib/data";
import { applyStockMovements } from "./stock";

export type CheckoutItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string; total: number; due: boolean }
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
  discount?: number,
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

  // The branch this sale belongs to (the cashier's branch / active context).
  // Null until branches exist, so pre-branch databases insert unchanged.
  const branchId = await resolveWriteBranchId(org);

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("tax_rate")
    .eq("id", org.orgId)
    .maybeSingle();
  const taxRate = orgRow?.tax_rate ?? 0;

  // SERVER-SIDE PRICE ENFORCEMENT: never trust the client's unit price. Clamp
  // each line to the product's allowed band [min_price, max_price] (open if null).
  // Migration-safe: if the band columns aren't applied, fall back to price >= 0.
  const ids = Array.from(new Set(clean.map((i) => i.productId)));
  let bandRows = await supabase.from("products").select("id, min_price, max_price").in("id", ids).eq("organization_id", org.orgId);
  if (bandRows.error) {
    bandRows = await supabase.from("products").select("id").in("id", ids).eq("organization_id", org.orgId) as typeof bandRows;
  }
  const bandMap = new Map(
    ((bandRows.data ?? []) as { id: string; min_price?: number | null; max_price?: number | null }[]).map(
      (r) => [r.id, { min: r.min_price ?? null, max: r.max_price ?? null }] as const,
    ),
  );
  const priceFor = (i: CheckoutItem) => {
    const b = bandMap.get(i.productId);
    const lo = Math.max(b?.min ?? 0, 0);
    const hi = b?.max ?? Number.POSITIVE_INFINITY;
    const raw = Math.round(Math.max(i.unitPrice, 0) * 100) / 100;
    return Math.min(Math.max(raw, lo), hi);
  };
  const priced = clean.map((i) => ({ ...i, unitPrice: priceFor(i) }));

  const subtotal = priced.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  // Discount is clamped to [0, subtotal]; tax applies to the discounted amount so
  // discount=0 (the default for existing callers) is identical to before.
  const disc = Math.max(0, Math.min(Math.round((discount ?? 0) * 100) / 100, subtotal));
  const taxable = Math.round((subtotal - disc) * 100) / 100;
  const tax = Math.round(taxable * (taxRate / 100) * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  const orderNumber = `ORD-${Date.now().toString().slice(-9)}`;

  // Server-side stock guard: never let a sale exceed the branch's on-hand stock,
  // even if the client is bypassed.
  if (branchId) {
    const stock = await getBranchStockMap(org.orgId, branchId);
    for (const i of priced) {
      const avail = stock.get(i.productId) ?? 0;
      if (i.quantity > avail) {
        return { ok: false, error: `Not enough stock at this branch — only ${avail} available for one of the items.` };
      }
    }
  }

  const orderPayload = {
    organization_id: org.orgId,
    order_number: orderNumber,
    // Paid orders are completed; a due order is "processing" until settled.
    status: (isDue ? "processing" : "completed") as "processing" | "completed",
    subtotal,
    discount: disc,
    tax,
    total,
    payment_method: paymentMethod,
    user_id: org.userId,
    // Only tag the account for a paid order, so a plain due sale still inserts
    // cleanly on a database where the account_id column isn't present yet.
    ...(paidAccountId ? { account_id: paidAccountId } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
    ...(branchId ? { branch_id: branchId } : {}),
  };

  const { data: order, error: orderErr } = await supabase
    .from("sales_orders")
    // branch_id isn't in the generated types yet → cast (same pattern as account_id era).
    .insert(orderPayload as never)
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message ?? "Could not create the order." };
  }

  const { error: itemsErr } = await supabase.from("sales_order_items").insert(
    priced.map((i) => ({
      organization_id: org.orgId,
      sales_order_id: order.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: Math.round(i.unitPrice * i.quantity * 100) / 100,
    })),
  );
  if (itemsErr) return { ok: false, error: itemsErr.message };

  // Decrement inventory + record sale movements — batched (few round-trips).
  await applyStockMovements(supabase, org.orgId, org.userId, priced.map((i) => ({ productId: i.productId, deduct: i.quantity })), "sale", orderNumber, branchId);

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
      ...(branchId ? { branch_id: branchId } : {}),
    } as never);
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/finance");
  revalidatePath("/pos");
  revalidatePath("/orders");

  return { ok: true, orderId: order.id, orderNumber, total, due: isDue };
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
  const branchId = await resolveWriteBranchId(org);

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
      ...(branchId ? { branch_id: branchId } : {}),
    } as never),
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

// ---------------------------------------------------------------------------
// Edit a PENDING (due/processing) order — add/remove items or change qty/price.
// Reconciles inventory by the delta vs. the order's previous lines, then rewrites
// the line items and totals. A due order posts NO revenue, so no finance changes
// are needed. Completed/settled orders are final and cannot be edited here.
// ---------------------------------------------------------------------------
export async function updatePendingOrder(
  orderId: string,
  items: CheckoutItem[],
  discount?: number,
  customerId?: string | null,
): Promise<CheckoutResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const clean = items.filter((i) => i.quantity > 0);
  if (clean.length === 0) return { ok: false, error: "An order must have at least one item." };

  const supabase = await createClient();

  // Order must exist, be this org's, and still be pending.
  const { data: order } = await supabase
    .from("sales_orders")
    .select("id, order_number, status")
    .eq("organization_id", org.orgId)
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "processing") return { ok: false, error: "Only pending orders can be edited." };
  const orderNumber = order.order_number;

  // Previous lines — for stock delta reconciliation.
  const { data: oldItemsRaw } = await supabase
    .from("sales_order_items")
    .select("product_id, quantity")
    .eq("organization_id", org.orgId)
    .eq("sales_order_id", orderId);
  const oldQty = new Map<string, number>();
  for (const li of (oldItemsRaw ?? []) as { product_id: string | null; quantity: number }[]) {
    if (li.product_id) oldQty.set(li.product_id, (oldQty.get(li.product_id) ?? 0) + li.quantity);
  }

  // Enforce the price band server-side (same as checkout).
  const ids = Array.from(new Set(clean.map((i) => i.productId)));
  let bandRows = await supabase.from("products").select("id, min_price, max_price").in("id", ids).eq("organization_id", org.orgId);
  if (bandRows.error) {
    bandRows = await supabase.from("products").select("id").in("id", ids).eq("organization_id", org.orgId) as typeof bandRows;
  }
  const bandMap = new Map(
    ((bandRows.data ?? []) as { id: string; min_price?: number | null; max_price?: number | null }[]).map(
      (r) => [r.id, { min: r.min_price ?? null, max: r.max_price ?? null }] as const,
    ),
  );
  const priced = clean.map((i) => {
    const b = bandMap.get(i.productId);
    const lo = Math.max(b?.min ?? 0, 0);
    const hi = b?.max ?? Number.POSITIVE_INFINITY;
    const raw = Math.round(Math.max(i.unitPrice, 0) * 100) / 100;
    return { ...i, unitPrice: Math.min(Math.max(raw, lo), hi) };
  });

  // Recompute totals.
  const { data: orgRow } = await supabase.from("organizations").select("tax_rate").eq("id", org.orgId).maybeSingle();
  const taxRate = orgRow?.tax_rate ?? 0;
  const subtotal = priced.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const disc = Math.max(0, Math.min(Math.round((discount ?? 0) * 100) / 100, subtotal));
  const taxable = Math.round((subtotal - disc) * 100) / 100;
  const tax = Math.round(taxable * (taxRate / 100) * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;

  // Rewrite line items.
  await supabase.from("sales_order_items").delete().eq("organization_id", org.orgId).eq("sales_order_id", orderId);
  const { error: itemsErr } = await supabase.from("sales_order_items").insert(
    priced.map((i) => ({
      organization_id: org.orgId,
      sales_order_id: orderId,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: Math.round(i.unitPrice * i.quantity * 100) / 100,
    })),
  );
  if (itemsErr) return { ok: false, error: itemsErr.message };

  // Update the order header.
  const { error: updErr } = await supabase
    .from("sales_orders")
    .update({ subtotal, discount: disc, tax, total, ...(customerId !== undefined ? { customer_id: customerId } : {}) })
    .eq("organization_id", org.orgId)
    .eq("id", orderId);
  if (updErr) return { ok: false, error: updErr.message };

  // Reconcile inventory by the per-product delta (new − old) — batched.
  const newQty = new Map<string, number>();
  for (const i of priced) newQty.set(i.productId, (newQty.get(i.productId) ?? 0) + i.quantity);
  const productIds = new Set([...oldQty.keys(), ...newQty.keys()]);
  const deltas = Array.from(productIds)
    .map((pid) => ({ productId: pid, deduct: (newQty.get(pid) ?? 0) - (oldQty.get(pid) ?? 0) }))
    .filter((d) => d.deduct !== 0);
  const editBranchId = await resolveWriteBranchId(org);
  await applyStockMovements(supabase, org.orgId, org.userId, deltas, "sale", `${orderNumber} (edit)`, editBranchId);

  revalidatePath("/pos");
  revalidatePath("/orders");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/dashboard");
  return { ok: true, orderId, orderNumber, total, due: true };
}
