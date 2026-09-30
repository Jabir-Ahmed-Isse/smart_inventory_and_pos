"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { canSettlePayments } from "@/lib/rbac";
import { getHeldOrders, getPendingOrders, getRecentSales, getSalesOrderDetail, getOrderForEdit, type PendingOrderRow, type RecentSaleRow, type SalesOrderDetail, type EditOrder } from "@/lib/data";
import { applyStockMovements } from "./stock";
import type { CheckoutItem, CheckoutResult } from "./actions";

type PayMethod = "cash" | "card" | "mobile" | "credit" | "bank";
const methodForKind = (kind: "bank" | "mobile" | "cash"): PayMethod =>
  kind === "mobile" ? "mobile" : kind === "cash" ? "cash" : "bank";

/** Clamps each line's price to the product's [min_price, max_price] band. */
async function clampToBand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  items: CheckoutItem[],
) {
  const ids = Array.from(new Set(items.map((i) => i.productId)));
  let rows = await supabase.from("products").select("id, min_price, max_price").in("id", ids).eq("organization_id", orgId);
  if (rows.error) rows = (await supabase.from("products").select("id").in("id", ids).eq("organization_id", orgId)) as typeof rows;
  const map = new Map(
    ((rows.data ?? []) as { id: string; min_price?: number | null; max_price?: number | null }[]).map(
      (r) => [r.id, { min: r.min_price ?? null, max: r.max_price ?? null }] as const,
    ),
  );
  return items.map((i) => {
    const b = map.get(i.productId);
    const lo = Math.max(b?.min ?? 0, 0);
    const hi = b?.max ?? Number.POSITIVE_INFINITY;
    return { ...i, unitPrice: Math.min(Math.max(Math.round(Math.max(i.unitPrice, 0) * 100) / 100, lo), hi) };
  });
}

async function fetchTaxRate(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string): Promise<number> {
  const { data } = await supabase.from("organizations").select("tax_rate").eq("id", orgId).maybeSingle();
  return data?.tax_rate ?? 0;
}
function computeTotals(priced: CheckoutItem[], taxRate: number, discount?: number) {
  const subtotal = priced.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const disc = Math.max(0, Math.min(Math.round((discount ?? 0) * 100) / 100, subtotal));
  const taxable = Math.round((subtotal - disc) * 100) / 100;
  const tax = Math.round(taxable * (taxRate / 100) * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  return { subtotal, disc, tax, total };
}

// ---------------------------------------------------------------------------
// HOLD — park the current cart as a `draft` order (no stock leaves, no money
// counted). Any user can resume it later. Becomes real only when finalized.
// ---------------------------------------------------------------------------
export async function holdOrder(items: CheckoutItem[], discount?: number, customerId?: string | null): Promise<CheckoutResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  const clean = items.filter((i) => i.quantity > 0);
  if (clean.length === 0) return { ok: false, error: "Nothing to hold." };

  const supabase = await createClient();
  const [priced, taxRate] = await Promise.all([clampToBand(supabase, org.orgId, clean), fetchTaxRate(supabase, org.orgId)]);
  const { subtotal, disc, tax, total } = computeTotals(priced, taxRate, discount);
  const orderNumber = `HLD-${Date.now().toString().slice(-9)}`;

  const { data: order, error } = await supabase
    .from("sales_orders")
    .insert({
      organization_id: org.orgId, order_number: orderNumber, status: "draft" as const,
      subtotal, discount: disc, tax, total, user_id: org.userId,
      ...(customerId ? { customer_id: customerId } : {}),
    })
    .select("id")
    .single();
  if (error || !order) return { ok: false, error: error?.message ?? "Could not hold the order." };

  const { error: itemsErr } = await supabase.from("sales_order_items").insert(
    priced.map((i) => ({ organization_id: org.orgId, sales_order_id: order.id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, line_total: Math.round(i.unitPrice * i.quantity * 100) / 100 })),
  );
  if (itemsErr) return { ok: false, error: itemsErr.message };

  revalidatePath("/pos");
  return { ok: true, orderId: order.id, orderNumber, total, due: true };
}

// ---------------------------------------------------------------------------
// FINALIZE a held (draft) order → real sale: decrement stock, set status, post
// revenue if paid. A draft never touched stock, so we decrement full quantities.
// ---------------------------------------------------------------------------
export async function finalizeHeldOrder(
  draftId: string,
  items: CheckoutItem[],
  accountId: string | null,
  customerId: string | null,
  discount?: number,
): Promise<CheckoutResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  const clean = items.filter((i) => i.quantity > 0);
  if (clean.length === 0) return { ok: false, error: "Cart is empty." };

  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("sales_orders").select("id, order_number, status").eq("organization_id", org.orgId).eq("id", draftId).maybeSingle();
  if (!draft) return { ok: false, error: "Held order not found." };
  if (draft.status !== "draft") return { ok: false, error: "This order is no longer on hold." };
  const orderNumber = draft.order_number;

  const [priced, taxRate] = await Promise.all([clampToBand(supabase, org.orgId, clean), fetchTaxRate(supabase, org.orgId)]);

  const canPay = canSettlePayments(org.role);
  let paymentMethod: PayMethod = "credit";
  let paidAccountId: string | null = null;
  if (canPay && accountId) {
    const { data: acc } = await supabase.from("payment_accounts").select("id, kind, is_active").eq("organization_id", org.orgId).eq("id", accountId).maybeSingle();
    if (!acc || !acc.is_active) return { ok: false, error: "That payment account is unavailable." };
    paidAccountId = acc.id;
    paymentMethod = methodForKind(acc.kind);
  }
  const isDue = paidAccountId === null;
  const { subtotal, disc, tax, total } = computeTotals(priced, taxRate, discount);

  await supabase.from("sales_order_items").delete().eq("organization_id", org.orgId).eq("sales_order_id", draftId);
  const { error: itemsErr } = await supabase.from("sales_order_items").insert(
    priced.map((i) => ({ organization_id: org.orgId, sales_order_id: draftId, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, line_total: Math.round(i.unitPrice * i.quantity * 100) / 100 })),
  );
  if (itemsErr) return { ok: false, error: itemsErr.message };

  const { error: updErr } = await supabase.from("sales_orders").update({
    status: (isDue ? "processing" : "completed") as "processing" | "completed",
    subtotal, discount: disc, tax, total, payment_method: paymentMethod,
    ...(paidAccountId ? { account_id: paidAccountId } : {}),
    ...(customerId !== undefined ? { customer_id: customerId } : {}),
  }).eq("organization_id", org.orgId).eq("id", draftId);
  if (updErr) return { ok: false, error: updErr.message };

  // Decrement stock for the full quantities (a draft never touched stock) — batched.
  await applyStockMovements(supabase, org.orgId, org.userId, priced.map((i) => ({ productId: i.productId, deduct: i.quantity })), "sale", orderNumber);

  if (!isDue) {
    await supabase.from("transactions").insert({ organization_id: org.orgId, type: "income", category: "Sales Revenue", description: `POS sale ${orderNumber}`, amount: total, reference: orderNumber, account_id: paidAccountId, user_id: org.userId });
  }

  revalidatePath("/dashboard"); revalidatePath("/products"); revalidatePath("/warehouse");
  revalidatePath("/finance"); revalidatePath("/pos"); revalidatePath("/orders");
  return { ok: true, orderId: draftId, orderNumber, total, due: isDue };
}

// ---------------------------------------------------------------------------
// Lazy-load the POS Sales panel (Held · Pending · Latest) ON DEMAND, so the POS
// itself loads fast — these lists are only fetched when the cashier opens the
// panel, not on every POS render.
// ---------------------------------------------------------------------------
/** Loads a held/pending order for editing WITHOUT a page reload (fast Edit/Resume). */
export async function loadOrderForEdit(orderId: string): Promise<EditOrder | null> {
  const org = await getActiveOrg();
  if (!org) return null;
  return getOrderForEdit(org.orgId, orderId);
}

/** Loads one order's full receipt data for the in-POS printable receipt modal. */
export async function getReceipt(orderId: string): Promise<SalesOrderDetail | null> {
  const org = await getActiveOrg();
  if (!org) return null;
  return getSalesOrderDetail(org.orgId, orderId);
}

export type SalesPanelData = { held: PendingOrderRow[]; pending: PendingOrderRow[]; recent: RecentSaleRow[] };
export async function loadSalesPanel(): Promise<SalesPanelData> {
  const org = await getActiveOrg();
  if (!org) return { held: [], pending: [], recent: [] };
  const [held, pending, recent] = await Promise.all([
    getHeldOrders(org.orgId),
    getPendingOrders(org.orgId),
    getRecentSales(org.orgId, 20),
  ]);
  return { held, pending, recent };
}

// ---------------------------------------------------------------------------
// Cancel / void an order. A held draft can be cancelled by anyone; a placed
// (processing/due) order can only be voided by a settler role and only if it
// has NO payments yet — its stock is returned to inventory. Completed orders
// are final (use a refund instead).
// ---------------------------------------------------------------------------
export async function cancelOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("sales_orders").select("id, order_number, status").eq("organization_id", org.orgId).eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "completed") return { ok: false, error: "A completed sale can't be cancelled — issue a refund instead." };
  if (order.status === "cancelled" || order.status === "refunded") return { ok: false, error: `Order is already ${order.status}.` };

  if (order.status === "processing") {
    if (!canSettlePayments(org.role)) return { ok: false, error: "Only a cashier/accountant can void a placed order." };
    // Block if any payment was recorded — that needs a refund, not a cancel.
    const { data: paid } = await supabase.from("transactions").select("amount").eq("organization_id", org.orgId).eq("type", "income").eq("reference", order.order_number);
    if ((paid ?? []).length > 0) return { ok: false, error: "This order has payments — refund it instead of cancelling." };

    // Return the stock that left when the due order was placed — batched.
    const { data: items } = await supabase.from("sales_order_items").select("product_id, quantity").eq("organization_id", org.orgId).eq("sales_order_id", orderId);
    const restore = ((items ?? []) as { product_id: string | null; quantity: number }[])
      .filter((li) => li.product_id)
      .map((li) => ({ productId: li.product_id as string, deduct: -li.quantity })); // negative = add back
    await applyStockMovements(supabase, org.orgId, org.userId, restore, "return", `${order.order_number} (cancelled)`);
  }

  const { error } = await supabase.from("sales_orders").update({ status: "cancelled" as const }).eq("organization_id", org.orgId).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/pos"); revalidatePath("/orders"); revalidatePath("/products"); revalidatePath("/warehouse");
  return { ok: true };
}
