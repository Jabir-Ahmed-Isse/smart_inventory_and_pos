import { cookies } from "next/headers";
import { getActiveOrg, type ActiveOrg } from "@/lib/org";
import { getUserBranches, hasOrgWideBranchScope, type Branch } from "./data";

export const ACTIVE_BRANCH_COOKIE = "active_branch";

export type BranchContext = {
  /** Branches the user may pick from. */
  branches: Branch[];
  /** Currently selected branch id, or null = "All Branches" / not scoped. */
  activeBranchId: string | null;
  /** Owner/admin (org-wide) may choose the "All Branches" aggregate view. */
  canSeeAll: boolean;
  /** Whether to render the selector at all (hidden for single-branch users). */
  showSelector: boolean;
};

/**
 * Resolves the user's branch context from their accessible branches + the
 * `active_branch` cookie. Safe on orgs with no branches (returns an empty,
 * hidden context). The cookie is validated against the user's own branches, so a
 * tampered value can never point at a branch they can't access.
 */
export async function getBranchContext(org: ActiveOrg): Promise<BranchContext> {
  const branches = await getUserBranches(org);
  const canSeeAll = hasOrgWideBranchScope(org);

  const cookieVal = (await cookies()).get(ACTIVE_BRANCH_COOKIE)?.value ?? null;
  const valid = cookieVal && branches.some((b) => b.id === cookieVal) ? cookieVal : null;

  // Users with exactly one branch and no org-wide view are simply locked to it.
  let activeBranchId: string | null;
  if (branches.length <= 1 && !canSeeAll) {
    activeBranchId = branches[0]?.id ?? null;
  } else {
    activeBranchId = valid; // null = All Branches (owner/admin) until they pick
  }

  const showSelector = branches.length > 1;

  return { branches, activeBranchId, canSeeAll, showSelector };
}

/**
 * Convenience for read queries: the currently-selected branch id to filter by,
 * or null = All Branches / no branch scope. Resolves the org + context in one
 * call so pages can do `loadX(orgId, await getActiveBranchId())`.
 */
export async function getActiveBranchId(): Promise<string | null> {
  const org = await getActiveOrg();
  if (!org) return null;
  return (await getBranchContext(org)).activeBranchId;
}

/**
 * The branch a NEW row should be tagged with, for a write in the current context:
 *   1. the user's only branch (locked single-branch users), else
 *   2. their selected active branch (cookie, if valid), else
 *   3. the org's primary branch (MAIN / earliest) as a safe default, else
 *   4. null (org has no branches yet — pre-migration).
 * Server-validated against the user's accessible branches, so it can never
 * resolve to a branch they can't access.
 */
export async function resolveWriteBranchId(org: ActiveOrg): Promise<string | null> {
  const branches = await getUserBranches(org);
  if (branches.length === 0) return null;
  if (branches.length === 1) return branches[0].id;

  const cookieVal = (await cookies()).get(ACTIVE_BRANCH_COOKIE)?.value ?? null;
  if (cookieVal && branches.some((b) => b.id === cookieVal)) return cookieVal;

  // No explicit selection ("All Branches"): fall back to the primary branch so
  // the row is still tagged rather than left company-level by accident.
  const main = branches.find((b) => b.code === "MAIN");
  return (main ?? branches[0]).id;
}
