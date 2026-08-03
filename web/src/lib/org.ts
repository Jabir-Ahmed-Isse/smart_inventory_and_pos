import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { USER_ID_HEADER } from "@/lib/supabase/constants";
import type { UserRole } from "@/lib/supabase/database.types";

export type ActiveOrg = {
  userId: string;
  orgId: string;
  orgName: string;
  currency: string;
  taxRate: number;
  role: UserRole;
  active: boolean;
};

/**
 * Resolves the signed-in user's active organization (their first membership).
 * Returns null when unauthenticated or not yet a member of any org.
 *
 * The user id comes from the `x-user-id` request header, which the middleware
 * sets after validating the session with auth.getUser() — so we skip a second
 * network round-trip here. The membership query still carries the auth JWT, so
 * RLS enforces tenant scoping regardless of the header value.
 * Wrapped in cache() to dedupe across a single request's render + actions.
 */
export const getActiveOrg = cache(
  async (): Promise<ActiveOrg | null> => {
    const userId = (await headers()).get(USER_ID_HEADER);
    if (!userId) return null;

    const supabase = await createClient();

    // Single joined query: pull the membership and its organization together
    // instead of two sequential round-trips.
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(name, currency, tax_rate, is_active)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    const org = membership.organizations;

    return {
      userId,
      orgId: membership.organization_id,
      orgName: org?.name ?? "Workspace",
      currency: org?.currency ?? "USD",
      taxRate: org?.tax_rate ?? 0,
      role: membership.role,
      active: org?.is_active ?? true,
    };
  },
);
