"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import type { Database } from "@/lib/supabase/database.types";

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];

export type CustomerImportRow = {
  name: string;
  email?: string;
  phone?: string;
  segment?: string;
  creditLimit?: number | string;
};
export type CustomerImportResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

const ROLES = ["owner", "admin", "manager"];

function num(v: number | string | undefined): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function importCustomers(rows: CustomerImportRow[]): Promise<CustomerImportResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!ROLES.includes(org.role)) return { ok: false, error: "Only owners, admins and managers can import customers." };

  const clean = rows.filter((r) => r.name && r.name.trim());
  if (clean.length === 0) return { ok: false, error: "No valid rows found (every customer needs a name)." };
  if (clean.length > 2000) return { ok: false, error: "Too many rows (max 2000 per import)." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("customers").select("name, email").eq("organization_id", org.orgId);
  const existingNames = new Set((existing ?? []).map((c) => c.name.trim().toLowerCase()));
  const existingEmails = new Set((existing ?? []).filter((c) => c.email).map((c) => c.email!.trim().toLowerCase()));

  const seen = new Set<string>();
  const payload: CustomerInsert[] = [];
  let skipped = 0;
  for (const r of clean) {
    const name = r.name.trim();
    const email = (r.email ?? "").trim().toLowerCase();
    const key = email || name.toLowerCase();
    if (seen.has(key) || (email && existingEmails.has(email)) || (!email && existingNames.has(name.toLowerCase()))) {
      skipped++;
      continue;
    }
    seen.add(key);
    payload.push({
      organization_id: org.orgId,
      name,
      email: (r.email ?? "").trim() || null,
      phone: (r.phone ?? "").trim() || null,
      segment: (r.segment ?? "").trim() || null,
      credit_limit: Math.round(num(r.creditLimit) * 100) / 100,
    });
  }

  if (payload.length === 0) return { ok: true, imported: 0, skipped };

  const { error, count } = await supabase.from("customers").insert(payload, { count: "exact" });
  if (error) return { ok: false, error: `Import failed: ${error.message}` };

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true, imported: count ?? payload.length, skipped };
}
