"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import type { UserRole } from "@/lib/supabase/database.types";

export type AccountResult = { ok: true } | { ok: false; error: string };

// Who may create/edit money accounts (financial setup, not day-to-day POS).
const MANAGE_ACCOUNTS: UserRole[] = ["owner", "admin", "manager", "accountant"];
const KINDS = ["bank", "mobile", "cash"] as const;

function revalidate() {
  revalidatePath("/finance/cash-bank");
  revalidatePath("/finance");
  revalidatePath("/pos");
  revalidatePath("/orders");
}

/** Create a payment account (bank or mobile-money). Bound via useActionState. */
export async function createAccount(_prev: unknown, formData: FormData): Promise<AccountResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!MANAGE_ACCOUNTS.includes(org.role)) {
    return { ok: false, error: "You don't have permission to add accounts." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "bank");
  const opening = Number(formData.get("opening_balance") ?? 0);

  if (!name) return { ok: false, error: "Account name is required." };
  if (!KINDS.includes(kind as (typeof KINDS)[number])) return { ok: false, error: "Invalid account type." };

  const supabase = await createClient();
  const { error } = await supabase.from("payment_accounts").insert({
    organization_id: org.orgId,
    name,
    kind: kind as (typeof KINDS)[number],
    opening_balance: Number.isFinite(opening) ? Math.round(opening * 100) / 100 : 0,
  });
  if (error) {
    if (error.message.includes("payment_accounts") || error.code === "42P01") {
      return { ok: false, error: "Accounts aren't set up yet — apply the payment_accounts migration first." };
    }
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true };
}

/** Activate / deactivate an account (deactivated accounts are hidden from POS). */
export async function toggleAccount(id: string, active: boolean): Promise<AccountResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!MANAGE_ACCOUNTS.includes(org.role)) return { ok: false, error: "You don't have permission." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_accounts")
    .update({ is_active: active })
    .eq("organization_id", org.orgId)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

/** Delete an account — only when nothing has been paid into it (else deactivate). */
export async function deleteAccount(id: string): Promise<AccountResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!MANAGE_ACCOUNTS.includes(org.role)) return { ok: false, error: "You don't have permission." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.orgId)
    .eq("account_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "This account has payments recorded against it. Deactivate it instead of deleting." };
  }

  const { error } = await supabase
    .from("payment_accounts")
    .delete()
    .eq("organization_id", org.orgId)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
