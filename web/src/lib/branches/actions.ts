"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { ACTIVE_BRANCH_COOKIE } from "./context";

/** Untyped client — the branches tables aren't in the generated types yet. */
async function db(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

async function requireManager() {
  const org = await getActiveOrg();
  if (!org) return { org: null as null, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { org: null as null, error: "Only owners and admins can manage branches." };
  }
  return { org, error: null as null };
}

/** Create a branch. Code must be unique within the organization. */
export async function createBranch(formData: FormData): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!name) return { ok: false, error: "Branch name is required." };
  if (!code) return { ok: false, error: "Branch code is required." };

  const supabase = await db();
  const { error: e } = await supabase.from("branches").insert({
    organization_id: org.orgId,
    name,
    code,
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    manager_id: str(formData, "manager_id"),
    is_active: true,
  } as never);
  if (e) return { ok: false, error: /duplicate|unique/i.test(e.message) ? `Branch code “${code}” is already in use.` : e.message };

  revalidatePath("/branches");
  return { ok: true };
}

/** Edit a branch's details (expects a hidden `id`). */
export async function updateBranch(formData: FormData): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing branch id." };
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!name) return { ok: false, error: "Branch name is required." };
  if (!code) return { ok: false, error: "Branch code is required." };

  const supabase = await db();
  const { error: e } = await supabase
    .from("branches")
    .update({
      name, code,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      city: str(formData, "city"),
      manager_id: str(formData, "manager_id"),
    } as never)
    .eq("organization_id", org.orgId)
    .eq("id", id);
  if (e) return { ok: false, error: /duplicate|unique/i.test(e.message) ? `Branch code “${code}” is already in use.` : e.message };

  revalidatePath("/branches");
  return { ok: true };
}

/** Activate / deactivate a branch. */
export async function setBranchActive(id: string, active: boolean): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const supabase = await db();
  const { error: e } = await supabase
    .from("branches")
    .update({ is_active: active } as never)
    .eq("organization_id", org.orgId)
    .eq("id", id);
  if (e) return { ok: false, error: e.message };

  revalidatePath("/branches");
  return { ok: true };
}

/**
 * Replace a user's branch assignments with the given set. Owner/admin have
 * org-wide scope and don't need assignments, so this is for the other roles.
 */
export async function assignUserBranches(userId: string, branchIds: string[]): Promise<ActionResult> {
  const { org, error } = await requireManager();
  if (!org) return { ok: false, error };

  const supabase = await db();
  // Clear existing, then insert the new set (small N per user).
  const del = await supabase.from("branch_members").delete().eq("organization_id", org.orgId).eq("user_id", userId);
  if (del.error) return { ok: false, error: del.error.message };

  if (branchIds.length) {
    const rows = branchIds.map((branch_id) => ({ organization_id: org.orgId, user_id: userId, branch_id }));
    const ins = await supabase.from("branch_members").insert(rows as never);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/branches");
  return { ok: true };
}

/** Set the active-branch context cookie (null / "all" clears it). */
export async function setActiveBranch(branchId: string | null): Promise<ActionResult> {
  const jar = await cookies();
  if (!branchId || branchId === "all") {
    jar.delete(ACTIVE_BRANCH_COOKIE);
  } else {
    jar.set(ACTIVE_BRANCH_COOKIE, branchId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return { ok: true };
}
