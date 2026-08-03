"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { getWarehouseOptions } from "@/lib/data";

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function int(v: FormDataEntryValue | null): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function fail(msg: string): never {
  redirect(`/products/new?error=${encodeURIComponent(msg)}`);
}

/**
 * Creates a product for the signed-in user's organization, seeds initial
 * inventory per warehouse, and records an opening-stock movement for each.
 * All writes are tenant-scoped by RLS (organization_id must match membership).
 */
export async function createProduct(formData: FormData) {
  const org = await getActiveOrg();
  if (!org) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  if (!name) fail("Product name is required.");
  if (!sku) fail("SKU is required.");

  const categoryId = String(formData.get("category_id") ?? "") || null;
  const brandId = String(formData.get("brand_id") ?? "") || null;

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      organization_id: org.orgId,
      name,
      sku,
      barcode: String(formData.get("barcode") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      image_url: String(formData.get("image_url") ?? "").trim() || null,
      category_id: categoryId,
      brand_id: brandId,
      cost_price: num(formData.get("cost_price")),
      retail_price: num(formData.get("retail_price")),
      min_stock: int(formData.get("min_stock")),
      reorder_point: int(formData.get("reorder_point")),
      status: "active",
    })
    .select("id")
    .single();

  if (error || !product) {
    fail(
      error?.code === "23505"
        ? `A product with SKU "${sku}" already exists.`
        : (error?.message ?? "Could not create product."),
    );
  }

  // Initial inventory per warehouse (only where a positive quantity was entered).
  const warehouses = await getWarehouseOptions(org.orgId);
  const invRows = warehouses
    .map((w) => ({ warehouse_id: w.id, quantity: int(formData.get(`qty_${w.id}`)) }))
    .filter((r) => r.quantity > 0);

  if (invRows.length > 0) {
    await supabase.from("inventory_levels").insert(
      invRows.map((r) => ({
        organization_id: org.orgId,
        product_id: product.id,
        warehouse_id: r.warehouse_id,
        quantity: r.quantity,
      })),
    );
    await supabase.from("stock_movements").insert(
      invRows.map((r) => ({
        organization_id: org.orgId,
        product_id: product.id,
        warehouse_id: r.warehouse_id,
        type: "receiving" as const,
        quantity: r.quantity,
        reference: "Opening stock",
        user_id: org.userId,
      })),
    );
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  revalidatePath("/stock-movements");
  redirect("/products");
}

/** Updates a product's fields and reconciles inventory quantities per warehouse. */
export async function updateProduct(productId: string, formData: FormData) {
  const org = await getActiveOrg();
  if (!org) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  if (!name) redirect(`/products/${productId}/edit?error=${encodeURIComponent("Product name is required.")}`);
  if (!sku) redirect(`/products/${productId}/edit?error=${encodeURIComponent("SKU is required.")}`);

  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      name,
      sku,
      barcode: String(formData.get("barcode") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      image_url: String(formData.get("image_url") ?? "").trim() || null,
      category_id: String(formData.get("category_id") ?? "") || null,
      brand_id: String(formData.get("brand_id") ?? "") || null,
      cost_price: num(formData.get("cost_price")),
      retail_price: num(formData.get("retail_price")),
      min_stock: int(formData.get("min_stock")),
      reorder_point: int(formData.get("reorder_point")),
    })
    .eq("organization_id", org.orgId)
    .eq("id", productId);

  if (error) {
    redirect(
      `/products/${productId}/edit?error=${encodeURIComponent(
        error.code === "23505" ? `SKU "${sku}" is already in use.` : error.message,
      )}`,
    );
  }

  // Reconcile inventory to the entered quantities, logging adjustments for deltas.
  const warehouses = await getWarehouseOptions(org.orgId);
  const { data: existing } = await supabase
    .from("inventory_levels")
    .select("id, warehouse_id, quantity")
    .eq("organization_id", org.orgId)
    .eq("product_id", productId);
  const levelByWh = new Map((existing ?? []).map((l) => [l.warehouse_id, l]));

  for (const w of warehouses) {
    const raw = formData.get(`qty_${w.id}`);
    if (raw === null) continue;
    const newQty = int(raw);
    const current = levelByWh.get(w.id);
    const oldQty = current?.quantity ?? 0;
    if (newQty === oldQty) continue;

    if (current) {
      await supabase.from("inventory_levels").update({ quantity: newQty }).eq("id", current.id);
    } else {
      await supabase.from("inventory_levels").insert({
        organization_id: org.orgId,
        product_id: productId,
        warehouse_id: w.id,
        quantity: newQty,
      });
    }
    await supabase.from("stock_movements").insert({
      organization_id: org.orgId,
      product_id: productId,
      warehouse_id: w.id,
      type: "adjustment",
      quantity: newQty - oldQty,
      reference: "Manual edit",
      user_id: org.userId,
    });
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  revalidatePath("/stock-movements");
  redirect("/products");
}

/** Permanently deletes a product (cascades inventory + movements). */
export async function deleteProduct(productId: string) {
  const org = await getActiveOrg();
  if (!org) redirect("/login");
  const supabase = await createClient();
  await supabase
    .from("products")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("id", productId);

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  redirect("/products");
}
