"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import type { Database } from "@/lib/supabase/database.types";

type SupplierInsert = Database["public"]["Tables"]["suppliers"]["Insert"];

export type SupplierImportRow = {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
};
export type SupplierImportResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

const ROLES = ["owner", "admin", "manager"];

export async function importSuppliers(rows: SupplierImportRow[]): Promise<SupplierImportResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!ROLES.includes(org.role)) return { ok: false, error: "Only owners, admins and managers can import suppliers." };

  const clean = rows.filter((r) => r.name && r.name.trim());
  if (clean.length === 0) return { ok: false, error: "No valid rows found (every supplier needs a name)." };
  if (clean.length > 2000) return { ok: false, error: "Too many rows (max 2000 per import)." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("suppliers").select("name, email").eq("organization_id", org.orgId);
  const existingNames = new Set((existing ?? []).map((s) => s.name.trim().toLowerCase()));
  const existingEmails = new Set((existing ?? []).filter((s) => s.email).map((s) => s.email!.trim().toLowerCase()));

  const seen = new Set<string>();
  const payload: SupplierInsert[] = [];
  let skipped = 0;
  for (const r of clean) {
    const name = r.name.trim();
    const key = name.toLowerCase();
    const email = (r.email ?? "").trim().toLowerCase();
    if (seen.has(key) || existingNames.has(key) || (email && existingEmails.has(email))) {
      skipped++;
      continue;
    }
    seen.add(key);
    payload.push({
      organization_id: org.orgId,
      name,
      contact_name: (r.contactName ?? "").trim() || null,
      email: (r.email ?? "").trim() || null,
      phone: (r.phone ?? "").trim() || null,
      address: (r.address ?? "").trim() || null,
      payment_terms: (r.paymentTerms ?? "").trim() || null,
    });
  }

  if (payload.length === 0) return { ok: true, imported: 0, skipped };

  const { error, count } = await supabase.from("suppliers").insert(payload, { count: "exact" });
  if (error) return { ok: false, error: `Import failed: ${error.message}` };

  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return { ok: true, imported: count ?? payload.length, skipped };
}
