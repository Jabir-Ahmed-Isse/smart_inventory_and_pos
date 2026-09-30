"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_ROLES = ["owner", "admin", "manager", "staff", "cashier", "accountant"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function updateMemberRole(userId: string, role: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can change roles." };
  }
  if (!VALID_ROLES.includes(role as Role)) {
    return { ok: false, error: "Invalid role." };
  }
  if (userId === org.userId && org.role === "owner" && role !== "owner") {
    return { ok: false, error: "You cannot demote yourself as the owner." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ role: role as Role })
    .eq("organization_id", org.orgId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/roles");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Sets a member's PRIMARY role plus any additional (extra) roles — the union is
 * the person's effective access (e.g. "manager" for stock + "accountant" for
 * finance). Migration-safe: if the extra_roles column isn't applied yet, the
 * primary role still saves and we report that extras need the migration.
 */
export async function updateMemberRoles(
  userId: string,
  primary: string,
  extra: string[],
): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can change roles." };
  }
  if (!VALID_ROLES.includes(primary as Role)) return { ok: false, error: "Invalid primary role." };
  const extras = Array.from(new Set(extra)).filter((r) => VALID_ROLES.includes(r as Role) && r !== primary);
  if (extras.length !== extra.filter((r) => r !== primary).length) {
    // some invalid values were dropped; still proceed with the valid ones
  }
  if (userId === org.userId && org.role === "owner" && primary !== "owner") {
    return { ok: false, error: "You cannot demote yourself as the owner." };
  }
  // Only an owner may grant the owner role.
  if ((primary === "owner" || extras.includes("owner")) && org.role !== "owner") {
    return { ok: false, error: "Only an owner can assign the owner role." };
  }

  const supabase = await createClient();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const scoped = (payload: Record<string, unknown>) =>
    (supabase.from("organization_members").update(payload as any) as any)
      .eq("organization_id", org.orgId)
      .eq("user_id", userId);

  // Try the full update (primary + extras). If extra_roles isn't migrated, retry
  // with just the primary role so the change isn't lost.
  const fullRes = (await scoped({ role: primary as Role, extra_roles: extras })) as { error: { message: string } | null };
  if (fullRes.error) {
    const baseRes = (await scoped({ role: primary as Role })) as { error: { message: string } | null };
    const baseErr = baseRes.error;
    if (baseErr) return { ok: false, error: baseErr.message };
    revalidatePath("/roles");
    revalidatePath("/admin");
    return extras.length
      ? { ok: false, error: "Primary role saved. To assign extra roles, apply the multi-role migration (20260815210000)." }
      : { ok: true };
  }

  revalidatePath("/roles");
  revalidatePath("/admin");
  return { ok: true };
}
