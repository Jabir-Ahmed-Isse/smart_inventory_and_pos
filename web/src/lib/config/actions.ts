"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategory(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Category name is required." };

  const slugInput = String(formData.get("slug") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    organization_id: org.orgId,
    name,
    slug: slugInput ? slugify(slugInput) : slugify(name),
    parent_id: parentId || null,
    status: (String(formData.get("status") ?? "active") as "active" | "inactive"),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/categories");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
export async function createBrand(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Brand name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("brands").insert({
    organization_id: org.orgId,
    name,
    website: String(formData.get("website") ?? "").trim() || null,
    status: (String(formData.get("status") ?? "active") as "active" | "inactive"),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/brands");
  return { ok: true };
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/brands");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
export async function createUnit(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name) return { ok: false, error: "Unit name is required." };
  if (!code) return { ok: false, error: "Unit code is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("units").insert({
    organization_id: org.orgId,
    name,
    code,
    base_unit: formData.get("base_unit") === "on",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/units");
  return { ok: true };
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/units");
  return { ok: true };
}
