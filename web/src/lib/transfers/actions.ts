"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { orgHasRole } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function db(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

async function requireManager() {
  const org = await getActiveOrg();
  if (!org) return { org: null as null, error: "You are not signed in." };
  if (!orgHasRole(org, ["owner", "admin", "manager"])) {
    return { org: null as null, error: "Only managers, admins and owners can move stock." };
  }
  return { org, error: null as null };
}

async function branchOfWarehouse(sb: SupabaseClient, orgId: string, warehouseId: string): Promise<string | null> {
  const { data, error } = await sb.from("warehouses").select("branch_id").eq("organization_id", orgId).eq("id", warehouseId).maybeSingle();
  if (error) return null;
  return (data as { branch_id?: string | null } | null)?.branch_id ?? null;
}

async function levelQty(sb: SupabaseClient, orgId: string, productId: string, warehouseId: string): Promise<{ id: string; quantity: number } | null> {
  const { data } = await sb.from("inventory_levels").select("id, quantity").eq("organization_id", orgId).eq("product_id", productId).eq("warehouse_id", warehouseId).maybeSingle();
  return (data as { id: string; quantity: number } | null) ?? null;
}

/** Request a transfer (status pending). Stock is NOT moved until it's completed. */
export async function createTransfer(formData: FormData): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const productId = String(formData.get("product_id") ?? "");
  const fromId = String(formData.get("from_warehouse_id") ?? "");
  const toId = String(formData.get("to_warehouse_id") ?? "");
  const qty = parseInt(String(formData.get("quantity") ?? ""), 10);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productId || !fromId || !toId) return { ok: false, error: "Select product, source and destination." };
  if (fromId === toId) return { ok: false, error: "Source and destination must differ." };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Enter a valid quantity." };

  const sb = await db();
  const from = await levelQty(sb, org.orgId, productId, fromId);
  if (!from || from.quantity < qty) return { ok: false, error: `Not enough stock at source (${from?.quantity ?? 0} available).` };

  const [sourceBranch, destBranch] = await Promise.all([
    branchOfWarehouse(sb, org.orgId, fromId),
    branchOfWarehouse(sb, org.orgId, toId),
  ]);

  const { error: e } = await sb.from("stock_transfers").insert({
    organization_id: org.orgId,
    transfer_number: `TRF-${Date.now().toString().slice(-9)}`,
    product_id: productId,
    quantity: qty,
    source_warehouse_id: fromId,
    dest_warehouse_id: toId,
    source_branch_id: sourceBranch,
    dest_branch_id: destBranch,
    status: "pending",
    notes,
    requested_by: org.userId,
  } as never);
  if (e) return { ok: false, error: e.message };

  revalidatePath("/transfers");
  return { ok: true };
}

/** Complete a pending transfer: move the stock and record the two movements. */
export async function completeTransfer(id: string): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const sb = await db();
  const { data: tr } = await sb
    .from("stock_transfers")
    .select("id, product_id, quantity, source_warehouse_id, dest_warehouse_id, source_branch_id, dest_branch_id, status, transfer_number")
    .eq("organization_id", org.orgId)
    .eq("id", id)
    .maybeSingle();
  const t = tr as null | {
    product_id: string; quantity: number; source_warehouse_id: string; dest_warehouse_id: string;
    source_branch_id: string | null; dest_branch_id: string | null; status: string; transfer_number: string;
  };
  if (!t) return { ok: false, error: "Transfer not found." };
  if (t.status !== "pending") return { ok: false, error: `This transfer is already ${t.status}.` };

  const from = await levelQty(sb, org.orgId, t.product_id, t.source_warehouse_id);
  if (!from || from.quantity < t.quantity) {
    return { ok: false, error: `Not enough stock at source anymore (${from?.quantity ?? 0} available).` };
  }
  const to = await levelQty(sb, org.orgId, t.product_id, t.dest_warehouse_id);

  // Deduct source, add destination.
  const upd1 = await sb.from("inventory_levels").update({ quantity: from.quantity - t.quantity }).eq("id", from.id);
  if (upd1.error) return { ok: false, error: upd1.error.message };
  if (to) {
    const upd2 = await sb.from("inventory_levels").update({ quantity: to.quantity + t.quantity }).eq("id", to.id);
    if (upd2.error) return { ok: false, error: upd2.error.message };
  } else {
    const ins = await sb.from("inventory_levels").insert({ organization_id: org.orgId, product_id: t.product_id, warehouse_id: t.dest_warehouse_id, quantity: t.quantity } as never);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // Two branch-tagged movements.
  await sb.from("stock_movements").insert([
    { organization_id: org.orgId, product_id: t.product_id, warehouse_id: t.source_warehouse_id, type: "transfer", quantity: -t.quantity, reference: `${t.transfer_number} (out)`, user_id: org.userId, branch_id: t.source_branch_id },
    { organization_id: org.orgId, product_id: t.product_id, warehouse_id: t.dest_warehouse_id, type: "transfer", quantity: t.quantity, reference: `${t.transfer_number} (in)`, user_id: org.userId, branch_id: t.dest_branch_id },
  ] as never);

  const done = await sb.from("stock_transfers").update({ status: "completed", completed_at: new Date().toISOString(), approved_by: org.userId } as never).eq("organization_id", org.orgId).eq("id", id);
  if (done.error) return { ok: false, error: done.error.message };

  revalidatePath("/transfers");
  revalidatePath("/products");
  revalidatePath("/warehouse");
  revalidatePath("/stock-movements");
  return { ok: true };
}

/** Cancel a pending transfer (no stock has moved yet). */
export async function cancelTransfer(id: string): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const sb = await db();
  const { error: e } = await sb
    .from("stock_transfers")
    .update({ status: "cancelled" } as never)
    .eq("organization_id", org.orgId)
    .eq("id", id)
    .eq("status", "pending");
  if (e) return { ok: false, error: e.message };

  revalidatePath("/transfers");
  return { ok: true };
}
