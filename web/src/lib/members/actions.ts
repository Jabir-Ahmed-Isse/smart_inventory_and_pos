"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_ROLES = ["owner", "admin", "manager", "staff", "accountant"] as const;
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
