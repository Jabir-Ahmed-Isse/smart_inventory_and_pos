import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ID_HEADER } from "@/lib/supabase/constants";
import type { UserRole } from "@/lib/supabase/database.types";

export type ActiveOrg = {
  userId: string;
  orgId: string;
  orgName: string;
  currency: string;
  taxRate: number;
  /** Primary role — unchanged, still the single source of truth for writes. */
  role: UserRole;
  /** Effective roles = primary role ∪ extra_roles. Owner always covers all. */
  roles: UserRole[];
  active: boolean;
};

type OrgEmbed = { name: string; currency: string; tax_rate: number; is_active: boolean } | null;
type Membership = { organization_id: string; role: UserRole; extra_roles?: UserRole[] | null; organizations: OrgEmbed };

function shape(userId: string, membership: Membership): ActiveOrg {
  const org = membership.organizations;
  const extras = Array.isArray(membership.extra_roles) ? membership.extra_roles : [];
  const roles = Array.from(new Set<UserRole>([membership.role, ...extras]));
  return {
    userId,
    orgId: membership.organization_id,
    orgName: org?.name ?? "Workspace",
    currency: org?.currency ?? "USD",
    taxRate: org?.tax_rate ?? 0,
    role: membership.role,
    roles,
    active: org?.is_active ?? true,
  };
}

/** True if the user holds ANY of the allowed roles (multi-role aware). */
export function orgHasRole(org: ActiveOrg | null, allowed: UserRole[]): boolean {
  if (!org) return false;
  if (org.roles.includes("owner")) return true;
  return org.roles.some((r) => allowed.includes(r));
}

const MEMBER_COLS_FULL = "organization_id, role, extra_roles, organizations(name, currency, tax_rate, is_active)";
const MEMBER_COLS_BASE = "organization_id, role, organizations(name, currency, tax_rate, is_active)";

/**
 * Cross-navigation cache of a user's active org. Keyed by the user id (which the
 * middleware validates before forwarding), so it is tenant-safe — a cache entry
 * only ever holds one user's own membership. Uses the service-role client so it
 * works outside request/cookie context. Revalidates every 30s.
 *
 * NOTE: this query intentionally does NOT select logo_url — it must never depend
 * on a column that may not exist yet, since it is the foundation for every page.
 */
/**
 * Reads a user's first membership. Tries the extra_roles column first and, if it
 * doesn't exist yet (migration not applied), retries with the base columns — so
 * multi-role degrades gracefully to single-role rather than breaking the app.
 */
async function readMembership(client: SupabaseClient, userId: string): Promise<Membership | null> {
  const q = (cols: string) =>
    client
      .from("organization_members")
      .select(cols)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

  const full = await q(MEMBER_COLS_FULL);
  if (!full.error) return (full.data as unknown as Membership) ?? null;
  const base = await q(MEMBER_COLS_BASE);
  return (base.data as unknown as Membership) ?? null;
}

const loadOrgForUser = unstable_cache(
  async (userId: string): Promise<ActiveOrg | null> => {
    const admin = createAdminClient()!;
    const membership = await readMembership(admin, userId);
    return membership ? shape(userId, membership) : null;
  },
  ["active-org"],
  { revalidate: 30, tags: ["active-org"] },
);

async function loadOrgWithRls(userId: string): Promise<ActiveOrg | null> {
  const supabase = await createClient();
  const membership = await readMembership(supabase, userId);
  return membership ? shape(userId, membership) : null;
}

const HAS_SERVICE_KEY = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Resolves the signed-in user's active organization from the `x-user-id` header
 * the middleware sets after validating the session. Deduped within a request and
 * cached for 30s across navigations.
 */
export const getActiveOrg = cache(async (): Promise<ActiveOrg | null> => {
  const userId = (await headers()).get(USER_ID_HEADER);
  if (!userId) return null;
  return HAS_SERVICE_KEY ? loadOrgForUser(userId) : loadOrgWithRls(userId);
});

export type OrgBrand = { logoUrl: string | null; tagline: string | null };

/**
 * Fetches the org's brand mark (logo + editable tagline) separately from
 * getActiveOrg. Migration-safe: tries logo_url + tagline, then just logo_url,
 * then gives up to null — so the sidebar degrades to initials + default tagline
 * rather than breaking. Never blocks the core app.
 */
export async function getOrgBrand(orgId: string): Promise<OrgBrand> {
  try {
    const supabase = await createClient();
    const full = await supabase.from("organizations").select("logo_url, tagline").eq("id", orgId).maybeSingle();
    if (!full.error) {
      const d = full.data as { logo_url: string | null; tagline: string | null } | null;
      return { logoUrl: d?.logo_url ?? null, tagline: d?.tagline ?? null };
    }
    const base = await supabase.from("organizations").select("logo_url").eq("id", orgId).maybeSingle();
    if (base.error) return { logoUrl: null, tagline: null };
    return { logoUrl: (base.data as { logo_url: string | null } | null)?.logo_url ?? null, tagline: null };
  } catch {
    return { logoUrl: null, tagline: null };
  }
}

export type OrgProfile = {
  name: string;
  tagline: string;
  legalName: string;
  industry: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  registrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
  currency: string;
  timezone: string;
  taxRate: number;
  logoUrl: string | null;
};

/**
 * Full company profile for the settings form. Migration-safe: if the extended
 * columns aren't there yet, the full select returns null and we fall back to the
 * base columns so the form still works (extra fields just show blank).
 */
export async function getOrgProfile(orgId: string): Promise<OrgProfile> {
  const supabase = await createClient();
  const cols =
    "name, tagline, currency, timezone, tax_rate, logo_url, legal_name, industry, email, phone, website, tax_id, registration_number, address_line1, address_line2, city, state_region, postal_code, country";
  let o: Record<string, unknown> | null = null;
  const full = await supabase.from("organizations").select(cols).eq("id", orgId).maybeSingle();
  o = (full.data as Record<string, unknown> | null) ?? null;
  if (!o) {
    const base = await supabase.from("organizations").select("name, currency, timezone, tax_rate, logo_url").eq("id", orgId).maybeSingle();
    o = (base.data as Record<string, unknown> | null) ?? {};
  }
  const str = (k: string) => (typeof o![k] === "string" ? (o![k] as string) : "");
  return {
    name: str("name") || "Workspace",
    tagline: str("tagline"),
    legalName: str("legal_name"),
    industry: str("industry"),
    email: str("email"),
    phone: str("phone"),
    website: str("website"),
    taxId: str("tax_id"),
    registrationNumber: str("registration_number"),
    addressLine1: str("address_line1"),
    addressLine2: str("address_line2"),
    city: str("city"),
    stateRegion: str("state_region"),
    postalCode: str("postal_code"),
    country: str("country"),
    currency: str("currency") || "USD",
    timezone: str("timezone") || "UTC",
    taxRate: typeof o["tax_rate"] === "number" ? (o["tax_rate"] as number) : 0,
    logoUrl: typeof o["logo_url"] === "string" ? (o["logo_url"] as string) : null,
  };
}
