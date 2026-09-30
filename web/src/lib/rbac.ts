import { redirect } from "next/navigation";
import { getActiveOrg, orgHasRole, type ActiveOrg } from "@/lib/org";
import type { UserRole } from "@/lib/supabase/database.types";

/**
 * Roles allowed to take/settle a payment into an account. Staff place due
 * orders only; a cashier or accountant (or an owner/admin/manager) settles them.
 */
export const PAYMENT_SETTLER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "manager",
  "accountant",
  "cashier",
];
export function canSettlePayments(role: UserRole): boolean {
  return PAYMENT_SETTLER_ROLES.includes(role);
}

/**
 * Server-side page guard: redirects to /login if unauthenticated, or to
 * /dashboard if the user's role isn't in `allowed`. Returns the org otherwise.
 * Defense-in-depth alongside the role-filtered sidebar.
 */
export async function requireRole(allowed: UserRole[]): Promise<ActiveOrg> {
  const org = await getActiveOrg();
  if (!org) redirect("/login");
  // Multi-role aware: pass if ANY effective role (primary ∪ extra_roles) qualifies.
  if (!orgHasRole(org, allowed)) redirect("/dashboard");
  return org;
}
