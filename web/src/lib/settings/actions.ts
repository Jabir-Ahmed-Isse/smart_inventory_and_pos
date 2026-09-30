"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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

/**
 * Sets or clears the organization's logo (a small resized data URL, or null to
 * remove). Owner/admin only. Busts the cached active-org so the new logo shows
 * on the very next navigation instead of after the 30s cache window.
 */
export async function updateOrgLogo(dataUrl: string | null): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can change the company logo." };
  }
  if (dataUrl) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(dataUrl)) {
      return { ok: false, error: "Upload a PNG, JPG, WEBP or SVG image." };
    }
    if (dataUrl.length > 700_000) {
      return { ok: false, error: "Logo is too large — please use a smaller image." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ logo_url: dataUrl }).eq("id", org.orgId);
  if (error) return { ok: false, error: error.message };

  revalidateTag("active-org");
  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Updates the full company profile. Owner/admin only. If the extended columns
 *  aren't migrated yet, falls back to saving the base fields so the form still
 *  works (address/tax IDs persist once the migration is applied). */
export async function updateOrgProfile(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can edit company info." };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Company name is required." };
  const currency = (String(formData.get("currency") ?? "USD").trim().toUpperCase()) || "USD";
  const taxRateRaw = parseFloat(String(formData.get("tax_rate") ?? "0"));
  const taxRate = Number.isFinite(taxRateRaw) ? taxRateRaw : 0;
  const g = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const base = { name, currency, tax_rate: taxRate, timezone: g("timezone") ?? "UTC" };
  const full = {
    ...base,
    tagline: g("tagline"),
    legal_name: g("legal_name"),
    industry: g("industry"),
    email: g("email"),
    phone: g("phone"),
    website: g("website"),
    tax_id: g("tax_id"),
    registration_number: g("registration_number"),
    address_line1: g("address_line1"),
    address_line2: g("address_line2"),
    city: g("city"),
    state_region: g("state_region"),
    postal_code: g("postal_code"),
    country: g("country"),
  };

  const supabase = await createClient();
  let { error } = await supabase.from("organizations").update(full).eq("id", org.orgId);
  if (error) {
    // Extended columns likely not migrated yet — save the base fields at least.
    ({ error } = await supabase.from("organizations").update(base).eq("id", org.orgId));
  }
  if (error) return { ok: false, error: error.message };

  revalidateTag("active-org");
  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}
