import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ActiveOrg } from "@/lib/org";
import type { UserRole } from "@/lib/supabase/database.types";

/** Roles with org-wide branch scope (see every branch). Others are assigned. */
export const ORG_WIDE_ROLES: UserRole[] = ["owner", "admin", "accountant"];

/** True if the user has org-wide branch scope. */
export function hasOrgWideBranchScope(org: ActiveOrg): boolean {
  return org.roles.some((r) => ORG_WIDE_ROLES.includes(r));
}

// ---------------------------------------------------------------------------
// Branch data layer. Every read is MIGRATION-SAFE: if the branches tables don't
// exist yet (migration not applied), reads return empty rather than throwing —
// so the app keeps working on organizations that have no branches.
// ---------------------------------------------------------------------------

export type Branch = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  managerId: string | null;
  isActive: boolean;
};

type BranchRow = {
  id: string; name: string; code: string; phone: string | null; email: string | null;
  address: string | null; city: string | null; manager_id: string | null; is_active: boolean;
};

function shape(r: BranchRow): Branch {
  return {
    id: r.id, name: r.name, code: r.code, phone: r.phone, email: r.email,
    address: r.address, city: r.city, managerId: r.manager_id, isActive: r.is_active,
  };
}

/** All branches in the org (management view). Empty if the table isn't there. */
export async function getBranches(orgId: string, client?: SupabaseClient): Promise<Branch[]> {
  try {
    const supabase = (client ?? (await createClient())) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code, phone, email, address, city, manager_id, is_active")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return ((data ?? []) as BranchRow[]).map(shape);
  } catch {
    return [];
  }
}

/** The branch_id → user_id assignments for the org, as a map user_id → branchIds[]. */
export async function getBranchAssignments(orgId: string): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("branch_members")
      .select("user_id, branch_id")
      .eq("organization_id", orgId);
    if (error) return map;
    for (const r of (data ?? []) as { user_id: string; branch_id: string }[]) {
      const list = map.get(r.user_id) ?? [];
      list.push(r.branch_id);
      map.set(r.user_id, list);
    }
    return map;
  } catch {
    return map;
  }
}

/**
 * Branches the signed-in user may access. Owner/admin see every ACTIVE branch;
 * everyone else sees only the active branches they're assigned to. Migration-safe.
 */
export async function getUserBranches(org: ActiveOrg): Promise<Branch[]> {
  const all = await getBranches(org.orgId);
  const active = all.filter((b) => b.isActive);
  if (hasOrgWideBranchScope(org)) return active;
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("branch_members")
      .select("branch_id")
      .eq("organization_id", org.orgId)
      .eq("user_id", org.userId);
    if (error) return [];
    const allowed = new Set(((data ?? []) as { branch_id: string }[]).map((r) => r.branch_id));
    return active.filter((b) => allowed.has(b.id));
  } catch {
    return [];
  }
}
