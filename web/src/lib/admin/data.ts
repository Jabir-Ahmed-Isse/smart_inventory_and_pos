import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ID_HEADER } from "@/lib/supabase/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves the current user id (from the middleware-set header) and whether they
 * are a platform admin. Cached per request. Defensive: if the is_platform_admin
 * column doesn't exist yet (migration not applied) or any query fails, returns
 * isPlatformAdmin=false rather than throwing — so the app degrades gracefully.
 */
export const getPlatformContext = cache(
  async (): Promise<{ userId: string | null; isPlatformAdmin: boolean }> => {
    try {
      const userId = (await headers()).get(USER_ID_HEADER);
      if (!userId) return { userId: null, isPlatformAdmin: false };

      // Untyped read — the column may not be in generated types yet.
      const sb = (await createClient()) as unknown as SupabaseClient;
      const { data, error } = await sb
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", userId)
        .maybeSingle();
      if (error) return { userId, isPlatformAdmin: false };
      return { userId, isPlatformAdmin: !!(data as { is_platform_admin?: boolean } | null)?.is_platform_admin };
    } catch {
      return { userId: null, isPlatformAdmin: false };
    }
  },
);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type CompanyRow = {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  members: number;
  owner: string;
  active: boolean;
};

/**
 * Lists every company (organization) on the platform with its owner and member
 * count. Platform-admin only — the caller (page) must gate on getPlatformContext.
 * Uses the service-role client to see across tenants.
 */
export async function getCompanies(): Promise<CompanyRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [orgsRes, membersRes, profilesRes] = await Promise.all([
    admin.from("organizations").select("id, name, currency, created_at, is_active").order("created_at", { ascending: false }),
    admin.from("organization_members").select("organization_id, user_id, role"),
    admin.from("profiles").select("id, full_name"),
  ]);

  const orgs = (orgsRes.data ?? []) as { id: string; name: string; currency: string; created_at: string; is_active: boolean }[];
  const members = (membersRes.data ?? []) as { organization_id: string; user_id: string; role: string }[];
  const names = new Map((((profilesRes.data ?? []) as { id: string; full_name: string | null }[])).map((p) => [p.id, p.full_name ?? "—"] as const));

  return orgs.map((o) => {
    const mine = members.filter((m) => m.organization_id === o.id);
    const owner = mine.find((m) => m.role === "owner");
    return {
      id: o.id,
      name: o.name,
      currency: o.currency,
      createdAt: fmtDate(o.created_at),
      members: mine.length,
      owner: owner ? names.get(owner.user_id) ?? "—" : "—",
      active: o.is_active,
    };
  });
}

export type CompanyMember = { userId: string; name: string; email: string; role: string; joined: string; isOwner: boolean };
export type CompanyDetail = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  createdAt: string;
  taxRate: number;
  timezone: string;
  members: CompanyMember[];
  stats: { products: number; warehouses: number; customers: number; salesOrders: number; revenue: number; purchaseOrders: number };
};

/**
 * Full detail for one company — profile, team (with emails) and business stats.
 * Platform-admin only; caller must gate. Cross-tenant via service role.
 */
export async function getCompanyDetail(orgId: string): Promise<CompanyDetail | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, currency, is_active, created_at, tax_rate, timezone")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return null;
  const o = org as { id: string; name: string; currency: string; is_active: boolean; created_at: string; tax_rate: number; timezone: string };

  const countFor = (table: string) =>
    admin.from(table).select("*", { count: "exact", head: true }).eq("organization_id", orgId);

  const [membersRes, profilesRes, usersRes, products, warehouses, customers, salesRes, purchases] = await Promise.all([
    admin.from("organization_members").select("user_id, role, created_at").eq("organization_id", orgId),
    admin.from("profiles").select("id, full_name"),
    admin.auth.admin.listUsers(),
    countFor("products"),
    countFor("warehouses"),
    countFor("customers"),
    admin.from("sales_orders").select("total, status").eq("organization_id", orgId),
    countFor("purchase_orders"),
  ]);

  const nameMap = new Map((((profilesRes.data ?? []) as { id: string; full_name: string | null }[])).map((p) => [p.id, p.full_name ?? "—"] as const));
  const emailMap = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? "—"] as const));

  const members: CompanyMember[] = (((membersRes.data ?? []) as { user_id: string; role: string; created_at: string }[]))
    .map((m) => ({
      userId: m.user_id,
      name: nameMap.get(m.user_id) ?? "—",
      email: emailMap.get(m.user_id) ?? "—",
      role: m.role,
      joined: fmtDate(m.created_at),
      isOwner: m.role === "owner",
    }))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));

  const sales = (salesRes.data ?? []) as { total: number; status: string }[];
  const revenue = sales.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + s.total, 0);

  return {
    id: o.id,
    name: o.name,
    currency: o.currency,
    active: o.is_active,
    createdAt: fmtDate(o.created_at),
    taxRate: o.tax_rate,
    timezone: o.timezone,
    members,
    stats: {
      products: products.count ?? 0,
      warehouses: warehouses.count ?? 0,
      customers: customers.count ?? 0,
      salesOrders: sales.length,
      revenue,
      purchaseOrders: purchases.count ?? 0,
    },
  };
}
