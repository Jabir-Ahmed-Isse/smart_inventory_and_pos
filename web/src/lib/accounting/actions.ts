"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import type { AccountType } from "@/lib/supabase/database.types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ACCOUNTING_PATHS = [
  "/accounting",
  "/accounting/chart-of-accounts",
  "/accounting/journal",
  "/accounting/general-ledger",
  "/accounting/trial-balance",
  "/accounting/balance-sheet",
  "/accounting/profit-loss",
];
function revalidateAccounting() {
  for (const p of ACCOUNTING_PATHS) revalidatePath(p);
}

/** Install a standard Chart of Accounts + posting mappings for this org. */
export async function seedAccounting(): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!["owner", "admin", "accountant"].includes(org.role))
    return { ok: false, error: "Only owners, admins or accountants can set up accounting." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_accounting", { p_org: org.orgId });
  if (error) return { ok: false, error: error.message };

  revalidateAccounting();
  return { ok: true, message: "Chart of accounts installed." };
}

/** Post ledger entries for sales/purchases that predate the ledger. */
export async function backfillAccounting(): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!["owner", "admin", "accountant"].includes(org.role))
    return { ok: false, error: "Not allowed." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("backfill_accounting", { p_org: org.orgId });
  if (error) return { ok: false, error: error.message };

  revalidateAccounting();
  revalidatePath("/finance");
  return { ok: true, message: `Processed ${data ?? 0} document(s) into the ledger.` };
}

/** Create a new ledger account. */
export async function createAccount(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!["owner", "admin", "accountant"].includes(org.role))
    return { ok: false, error: "Not allowed." };

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AccountType;
  const subtype = String(formData.get("subtype") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!code) return { ok: false, error: "Account code is required." };
  if (!name) return { ok: false, error: "Account name is required." };
  if (!["asset", "liability", "equity", "income", "expense"].includes(type))
    return { ok: false, error: "Choose an account type." };

  const supabase = await createClient();
  const { error } = await supabase.from("chart_of_accounts").insert({
    organization_id: org.orgId,
    code,
    name,
    type,
    subtype,
    description,
    is_system: false,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: `Account code ${code} already exists.` };
    return { ok: false, error: error.message };
  }

  revalidateAccounting();
  return { ok: true, message: "Account created." };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!["owner", "admin", "accountant"].includes(org.role))
    return { ok: false, error: "Not allowed." };

  const supabase = await createClient();
  // Protect system accounts and any account that has ledger activity.
  const { data: acc } = await supabase
    .from("chart_of_accounts")
    .select("is_system")
    .eq("id", id)
    .eq("organization_id", org.orgId)
    .maybeSingle();
  if (!acc) return { ok: false, error: "Account not found." };
  if (acc.is_system) return { ok: false, error: "Standard accounts can't be deleted — deactivate it instead." };

  const { count } = await supabase
    .from("journal_lines")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: "This account has ledger entries — deactivate it instead." };

  const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id).eq("organization_id", org.orgId);
  if (error) return { ok: false, error: error.message };

  revalidateAccounting();
  return { ok: true, message: "Account deleted." };
}

export type JournalLineInput = { accountId: string; description?: string; debit: number; credit: number };

/** Create a manual double-entry journal, optionally posting it immediately. */
export async function createJournalEntry(input: {
  entryDate: string;
  memo?: string;
  reference?: string;
  lines: JournalLineInput[];
  post: boolean;
}): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!["owner", "admin", "accountant"].includes(org.role))
    return { ok: false, error: "Not allowed." };

  const lines = (input.lines ?? [])
    .map((l) => ({
      account_id: l.accountId,
      description: l.description?.trim() || null,
      debit: Math.round((Number(l.debit) || 0) * 100) / 100,
      credit: Math.round((Number(l.credit) || 0) * 100) / 100,
    }))
    .filter((l) => l.account_id && (l.debit > 0 || l.credit > 0));

  if (lines.length < 2) return { ok: false, error: "A journal needs at least two lines." };
  if (lines.some((l) => l.debit > 0 && l.credit > 0))
    return { ok: false, error: "Each line is either a debit or a credit, not both." };

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01)
    return { ok: false, error: `Not balanced — debits ${totalDebit.toFixed(2)} ≠ credits ${totalCredit.toFixed(2)}.` };

  const supabase = await createClient();

  // Sequential entry number (JE-00001…). Unique constraint is the real guard.
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.orgId);
  const entryNumber = `JE-${String((count ?? 0) + 1).padStart(5, "0")}`;

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: org.orgId,
      entry_number: entryNumber,
      entry_date: input.entryDate || new Date().toISOString().slice(0, 10),
      memo: input.memo?.trim() || null,
      reference: input.reference?.trim() || null,
      source: "manual",
      status: "draft",
      created_by: org.userId,
    })
    .select("id")
    .single();
  if (entryErr || !entry) return { ok: false, error: entryErr?.message ?? "Could not create entry." };

  const { error: linesErr } = await supabase.from("journal_lines").insert(
    lines.map((l, i) => ({
      organization_id: org.orgId,
      journal_entry_id: entry.id,
      account_id: l.account_id,
      description: l.description,
      debit: l.debit,
      credit: l.credit,
      line_no: i + 1,
    })),
  );
  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return { ok: false, error: linesErr.message };
  }

  if (input.post) {
    const { error: postErr } = await supabase.rpc("post_journal_entry", { p_entry: entry.id });
    if (postErr) return { ok: false, error: postErr.message };
  }

  revalidateAccounting();
  return { ok: true, message: input.post ? "Journal entry posted." : "Journal entry saved as draft." };
}

export async function postEntry(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_journal_entry", { p_entry: id });
  if (error) return { ok: false, error: error.message };
  revalidateAccounting();
  return { ok: true, message: "Entry posted." };
}

export async function voidEntry(id: string): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_journal_entry", { p_entry: id });
  if (error) return { ok: false, error: error.message };
  revalidateAccounting();
  return { ok: true, message: "Entry voided." };
}
