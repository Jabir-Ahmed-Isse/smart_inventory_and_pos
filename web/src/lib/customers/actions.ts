"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type CustomerResult = { ok: true } | { ok: false; error: string };

export async function createCustomer(formData: FormData): Promise<CustomerResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Customer name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    organization_id: org.orgId,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    segment: String(formData.get("segment") ?? "").trim() || null,
    loyalty_points: parseInt(String(formData.get("loyalty_points") ?? "0"), 10) || 0,
    credit_limit: parseFloat(String(formData.get("credit_limit") ?? "0")) || 0,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}
