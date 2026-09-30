"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { getAccountMappings, postLedgerEntry } from "@/lib/accounting/ledger";

export type ActionResult = { ok: true } | { ok: false; error: string };

type DB = Awaited<ReturnType<typeof createClient>>;
type ManualTx = { id: string; type: string; amount: number; category: string | null; description: string | null; created_at: string };

/**
 * Posts a manual Finance income/expense as a balanced double-entry journal so it
 * shows up in Accounting (Trial Balance, General Ledger, Ledger P&L) alongside
 * sales, purchases, payroll & expenses. Best-effort: if the accounting engine
 * isn't set up for this company (no account mappings), it quietly does nothing
 * and the transaction still stands. Returns the journal id, or null if skipped.
 */
async function postFinanceTxToLedger(supabase: DB, orgId: string, userId: string, tx: ManualTx): Promise<string | null> {
  const map = await getAccountMappings(supabase, orgId);
  const cash = map.cash ?? map.bank ?? null; // money in/out lands in Cash (fallback Bank)
  const date = (tx.created_at ?? new Date().toISOString()).slice(0, 10);
  const memo = tx.description || tx.category || (tx.type === "income" ? "Manual income" : "Manual expense");

  if (tx.type === "income") {
    const income = map.other_income ?? null;
    if (!cash || !income) return null;
    return postLedgerEntry(supabase, orgId, {
      date, memo, reference: "finance", source: "manual", sourceId: tx.id, createdBy: userId,
      lines: [
        { accountId: cash, description: "Cash received", debit: tx.amount, credit: 0 },
        { accountId: income, description: tx.category ?? "Other income", debit: 0, credit: tx.amount },
      ],
    });
  }
  const expense = map.other_expense ?? null;
  if (!cash || !expense) return null;
  return postLedgerEntry(supabase, orgId, {
    date, memo, reference: "finance", source: "manual", sourceId: tx.id, createdBy: userId,
    lines: [
      { accountId: expense, description: tx.category ?? "Other expense", debit: tx.amount, credit: 0 },
      { accountId: cash, description: "Cash paid", debit: 0, credit: tx.amount },
    ],
  });
}

/** Records a manual income or expense transaction (rent, utilities, capital, etc.). */
export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const type = String(formData.get("type") ?? "");
  if (type !== "income" && type !== "expense") return { ok: false, error: "Choose income or expense." };

  const amount = parseFloat(String(formData.get("amount") ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  const category = String(formData.get("category") ?? "").trim() || (type === "income" ? "Other Income" : "Other Expense");
  const description = String(formData.get("description") ?? "").trim() || null;

  // Optional backdate — otherwise defaults to now.
  const dateStr = String(formData.get("date") ?? "").trim();
  const createdAt = dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : undefined;

  const supabase = await createClient();

  // Optional: which Cash & Bank account this money lands in / comes from. Validated
  // against this org's accounts so a stray id can't attach money to another tenant.
  const accountIdRaw = String(formData.get("account_id") ?? "").trim();
  let accountId: string | null = null;
  if (accountIdRaw) {
    const { data: acct } = await supabase
      .from("payment_accounts")
      .select("id")
      .eq("organization_id", org.orgId)
      .eq("id", accountIdRaw)
      .maybeSingle();
    if (acct) accountId = accountIdRaw;
  }

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      organization_id: org.orgId,
      type,
      category,
      description,
      amount: Math.round(amount * 100) / 100,
      reference: "manual",
      user_id: org.userId,
      ...(accountId ? { account_id: accountId } : {}),
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    .select("id, type, amount, category, description, created_at")
    .single();

  if (error) return { ok: false, error: error.message };

  // Connect Finance → Accounting: post a balanced journal entry so this shows in
  // the ledger too. Best-effort — a ledger hiccup must not lose the transaction.
  if (inserted) {
    try {
      await postFinanceTxToLedger(supabase, org.orgId, org.userId, inserted as ManualTx);
    } catch {
      /* accounting not configured / transient — transaction still saved */
    }
  }

  revalidatePath("/finance");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/cash-flow");
  revalidatePath("/finance/cash-bank");
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/general-ledger");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/accounting/profit-loss");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Attaches (or clears) the Cash & Bank account for an existing money movement, so
 * a transaction recorded without an account can be pointed at the right account
 * and start counting toward its balance. Validated against this org's accounts.
 */
export async function assignTransactionAccount(txId: string, accountId: string | null): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!org.roles.some((r) => ["owner", "admin", "manager", "accountant"].includes(r))) {
    return { ok: false, error: "You don't have access to change accounts." };
  }
  const supabase = await createClient();

  let value: string | null = null;
  if (accountId) {
    const { data: acct } = await supabase
      .from("payment_accounts")
      .select("id")
      .eq("organization_id", org.orgId)
      .eq("id", accountId)
      .maybeSingle();
    if (!acct) return { ok: false, error: "That account doesn't exist." };
    value = accountId;
  }

  const { error } = await supabase
    .from("transactions")
    .update({ account_id: value })
    .eq("organization_id", org.orgId)
    .eq("id", txId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/finance/cash-bank");
  revalidatePath("/finance");
  return { ok: true };
}

export type SyncResult = { ok: true; posted: number; skipped: number; already: number } | { ok: false; error: string };

/**
 * Backfills every manual Finance income/expense that isn't in the ledger yet,
 * posting each as a balanced journal entry. Idempotent — entries already posted
 * (matched by source='manual' + source_id) are left alone, so it's safe to run
 * repeatedly. Owner/admin/accountant only.
 */
export async function syncFinanceToLedger(): Promise<SyncResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!org.roles.some((r) => ["owner", "admin", "accountant"].includes(r))) {
    return { ok: false, error: "Only owners, admins and accountants can sync to accounting." };
  }

  const supabase = await createClient();

  // Manual finance entries (POS sales use their order number as reference, not "manual").
  const { data: txRows, error: txErr } = await supabase
    .from("transactions")
    .select("id, type, amount, category, description, created_at")
    .eq("organization_id", org.orgId)
    .eq("reference", "manual");
  if (txErr) return { ok: false, error: txErr.message };
  const txs = (txRows ?? []) as ManualTx[];
  if (txs.length === 0) return { ok: true, posted: 0, skipped: 0, already: 0 };

  // Which are already posted?
  const { data: jeRows } = await supabase
    .from("journal_entries")
    .select("source_id")
    .eq("organization_id", org.orgId)
    .eq("source", "manual");
  const posted = new Set((jeRows ?? []).map((r) => r.source_id).filter(Boolean));

  let ok = 0;
  let skipped = 0;
  let already = 0;
  for (const tx of txs) {
    if (posted.has(tx.id)) {
      already++;
      continue;
    }
    try {
      const id = await postFinanceTxToLedger(supabase, org.orgId, org.userId, tx);
      if (id) ok++;
      else skipped++; // accounting engine not configured (no mappings)
    } catch {
      skipped++;
    }
  }

  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/general-ledger");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/accounting/profit-loss");
  return { ok: true, posted: ok, skipped, already };
}
