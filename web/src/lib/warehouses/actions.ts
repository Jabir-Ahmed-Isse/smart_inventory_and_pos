"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createWarehouse(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Location name is required." };

  const supabase = await createClient();

  // If this is flagged primary, clear the flag on other warehouses first.
  const makePrimary = formData.get("is_primary") === "on";
  if (makePrimary) {
    await supabase
      .from("warehouses")
      .update({ is_primary: false })
      .eq("organization_id", org.orgId);
  }

  const { error } = await supabase.from("warehouses").insert({
    organization_id: org.orgId,
    name,
    location: String(formData.get("location") ?? "").trim() || null,
    is_primary: makePrimary,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/locations");
  revalidatePath("/warehouse");
  revalidatePath("/workspace");
  return { ok: true };
}

export async function deleteWarehouse(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const supabase = await createClient();

  // Guard: refuse to delete a warehouse that still holds stock, so real
  // inventory can never be wiped by accident. Only empty warehouses are removable.
  const { data: levels } = await supabase
    .from("inventory_levels")
    .select("quantity")
    .eq("organization_id", org.orgId)
    .eq("warehouse_id", id);

  const onHand = (levels ?? []).reduce((sum, l) => sum + (l.quantity ?? 0), 0);
  if (onHand > 0) {
    return {
      ok: false,
      error: `This warehouse still holds ${onHand} unit${onHand === 1 ? "" : "s"} of stock. Transfer or sell it first, then delete.`,
    };
  }

  // Clean up any empty (zero-qty) inventory rows so the delete is unambiguous.
  await supabase
    .from("inventory_levels")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("warehouse_id", id);

  const { error } = await supabase
    .from("warehouses")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/locations");
  revalidatePath("/warehouse");
  revalidatePath("/workspace");
  return { ok: true };
}
