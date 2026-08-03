"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Supplier name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    organization_id: org.orgId,
    name,
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    payment_terms: String(formData.get("payment_terms") ?? "").trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  revalidatePath("/rfq");
  return { ok: true };
}
