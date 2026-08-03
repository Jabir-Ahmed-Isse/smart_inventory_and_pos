"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Untyped client — the feature tables aren't in the generated types yet. */
async function untypedClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await createClient()) as any;
}

const MIGRATION_HINT =
  "This feature's table isn't in the database yet. Apply migration 20260726120000_bundles_shipping_timesheets.sql to your Supabase project.";

// Bundles -------------------------------------------------------------------
export async function createBundle(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Bundle name is required." };
  const price = parseFloat(String(formData.get("price") ?? "0")) || 0;
  const componentId = String(formData.get("product_id") ?? "");
  const componentQty = parseInt(String(formData.get("quantity") ?? "1"), 10) || 1;

  const db = await untypedClient();
  const { data: bundle, error } = await db
    .from("product_bundles")
    .insert({
      organization_id: org.orgId,
      name,
      sku: String(formData.get("sku") ?? "").trim() || null,
      price,
      status: "active",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message.includes("does not exist") ? MIGRATION_HINT : error.message };

  if (componentId && bundle) {
    await db.from("bundle_items").insert({
      organization_id: org.orgId,
      bundle_id: bundle.id,
      product_id: componentId,
      quantity: componentQty,
    });
  }

  revalidatePath("/bundles");
  return { ok: true };
}

// Shipments -----------------------------------------------------------------
export async function createShipment(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const tracking = String(formData.get("tracking_number") ?? "").trim();
  if (!tracking) return { ok: false, error: "Tracking number is required." };

  const db = await untypedClient();
  const { error } = await db.from("shipments").insert({
    organization_id: org.orgId,
    tracking_number: tracking,
    carrier: String(formData.get("carrier") ?? "").trim() || null,
    destination: String(formData.get("destination") ?? "").trim() || null,
    status: String(formData.get("status") ?? "pending"),
  });
  if (error) return { ok: false, error: error.message.includes("does not exist") ? MIGRATION_HINT : error.message };

  revalidatePath("/shipping");
  return { ok: true };
}

// Timesheets ----------------------------------------------------------------
export async function logTimesheet(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const hours = parseFloat(String(formData.get("hours") ?? "0"));
  if (!Number.isFinite(hours) || hours <= 0) return { ok: false, error: "Enter valid hours." };
  const workDate = String(formData.get("work_date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const db = await untypedClient();
  const { error } = await db.from("timesheets").insert({
    organization_id: org.orgId,
    user_id: org.userId,
    work_date: workDate,
    hours,
    note: String(formData.get("note") ?? "").trim() || null,
    status: "submitted",
  });
  if (error) return { ok: false, error: error.message.includes("does not exist") ? MIGRATION_HINT : error.message };

  revalidatePath("/timesheets");
  return { ok: true };
}
