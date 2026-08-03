"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateOrgSettings(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can change workspace settings." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Workspace name is required." };

  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const taxRate = parseFloat(String(formData.get("tax_rate") ?? "0"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      currency,
      tax_rate: Number.isFinite(taxRate) ? taxRate : 0,
    })
    .eq("id", org.orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
