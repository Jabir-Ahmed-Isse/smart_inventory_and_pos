"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ImportRow = { item: string; godown: string; quantity: number; rate: number };
export type ImportResult =
  | { ok: true; imported: number; skipped: number; warehousesCreated: number; unitsAdded: number }
  | { ok: false; error: string };

function slugSku(name: string): string {
  return (
    name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 18) || "ITEM"
  );
}

/**
 * Bulk-imports products from a parsed spreadsheet. Auto-creates any warehouse
 * named in the "Godown" column, generates unique SKUs (the source has none),
 * seeds stock per warehouse and logs an opening movement. Batched for speed.
 */
export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin" || org.role === "manager")) {
    return { ok: false, error: "Only owners, admins and managers can import products." };
  }
  const clean = rows.filter((r) => r.item && r.item.trim());
  if (clean.length === 0) return { ok: false, error: "No valid product rows found." };
  if (clean.length > 5000) return { ok: false, error: "Too many rows (max 5000 per import)." };

  const supabase = await createClient();

  // --- Warehouses: match by name, create the missing "godown" names ---------
  const { data: existingWh } = await supabase
    .from("warehouses")
    .select("id, name, is_primary")
    .eq("organization_id", org.orgId);
  const whByName = new Map<string, string>();
  for (const w of existingWh ?? []) whByName.set(w.name.trim().toLowerCase(), w.id);
  const primaryWh = (existingWh ?? []).find((w) => w.is_primary)?.id ?? (existingWh ?? [])[0]?.id;

  const godowns = [...new Set(clean.map((r) => (r.godown || "Main Location").trim()).filter(Boolean))];
  const toCreate = godowns.filter((g) => !whByName.has(g.toLowerCase()));
  let warehousesCreated = 0;
  if (toCreate.length > 0) {
    const { data: created, error: whErr } = await supabase
      .from("warehouses")
      .insert(toCreate.map((name, i) => ({
        organization_id: org.orgId,
        name,
        is_primary: !primaryWh && i === 0, // first one becomes primary if none exists
      })))
      .select("id, name");
    if (whErr) return { ok: false, error: `Warehouse setup failed: ${whErr.message}` };
    for (const w of created ?? []) whByName.set(w.name.trim().toLowerCase(), w.id);
    warehousesCreated = created?.length ?? 0;
  }
  const whId = (g: string) => whByName.get((g || "Main Location").trim().toLowerCase()) ?? primaryWh ?? whByName.get((godowns[0] ?? "main location").toLowerCase());

  // --- Existing products & SKUs (skip duplicates by name) -------------------
  const { data: existingProds } = await supabase
    .from("products")
    .select("name, sku")
    .eq("organization_id", org.orgId);
  const existingNames = new Set((existingProds ?? []).map((p) => p.name.trim().toLowerCase()));
  const usedSkus = new Set((existingProds ?? []).map((p) => p.sku));

  // --- Group input rows by item → one product, stock per warehouse ----------
  type Agg = { name: string; rate: number; stock: Map<string, number> };
  const byItem = new Map<string, Agg>();
  for (const r of clean) {
    const key = r.item.trim().toLowerCase();
    const g = byItem.get(key) ?? { name: r.item.trim(), rate: 0, stock: new Map() };
    if (!g.rate && r.rate > 0) g.rate = r.rate;
    const wid = whId(r.godown);
    if (wid) g.stock.set(wid, (g.stock.get(wid) ?? 0) + Math.max(0, Math.round(r.quantity || 0)));
    byItem.set(key, g);
  }

  const fresh = [...byItem.values()].filter((a) => !existingNames.has(a.name.toLowerCase()));
  const skipped = byItem.size - fresh.length;
  if (fresh.length === 0) return { ok: true, imported: 0, skipped, warehousesCreated, unitsAdded: 0 };

  // --- Batch insert products ------------------------------------------------
  const productPayload = fresh.map((a) => {
    let sku = slugSku(a.name);
    let n = 1;
    while (usedSkus.has(sku)) sku = `${slugSku(a.name)}-${++n}`;
    usedSkus.add(sku);
    return {
      organization_id: org.orgId,
      name: a.name,
      sku,
      retail_price: Math.round((a.rate || 0) * 100) / 100,
      cost_price: Math.round((a.rate || 0) * 100) / 100,
      status: "active" as const,
    };
  });

  const { data: insertedProducts, error: prodErr } = await supabase
    .from("products")
    .insert(productPayload)
    .select("id");
  if (prodErr || !insertedProducts) return { ok: false, error: `Product import failed: ${prodErr?.message}` };

  // --- Batch insert inventory + opening movements ---------------------------
  const invRows: { organization_id: string; product_id: string; warehouse_id: string; quantity: number }[] = [];
  const mvRows: { organization_id: string; product_id: string; warehouse_id: string; type: "receiving"; quantity: number; reference: string; user_id: string }[] = [];
  let unitsAdded = 0;
  fresh.forEach((a, i) => {
    const pid = insertedProducts[i]?.id;
    if (!pid) return;
    for (const [wid, qty] of a.stock) {
      if (qty <= 0) continue;
      invRows.push({ organization_id: org.orgId, product_id: pid, warehouse_id: wid, quantity: qty });
      mvRows.push({ organization_id: org.orgId, product_id: pid, warehouse_id: wid, type: "receiving", quantity: qty, reference: "Import", user_id: org.userId });
      unitsAdded += qty;
    }
  });
  if (invRows.length > 0) await supabase.from("inventory_levels").insert(invRows);
  if (mvRows.length > 0) await supabase.from("stock_movements").insert(mvRows);

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  return { ok: true, imported: insertedProducts.length, skipped, warehousesCreated, unitsAdded };
}
