import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JournalSource } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

/** Map of mapping-key → account_id for an org (e.g. { salaries_expense: "…" }). */
export async function getAccountMappings(supabase: DB, orgId: string): Promise<Record<string, string>> {
  const { data } = await supabase.from("account_mappings").select("key, account_id").eq("organization_id", orgId);
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.key] = r.account_id;
  return map;
}

export async function nextEntryNumber(supabase: DB, orgId: string): Promise<string> {
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return `JE-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

export type LedgerLine = { accountId: string; description?: string | null; debit: number; credit: number };

/**
 * Insert a *posted*, balanced journal entry. Zero lines are dropped. Returns the
 * entry id, or null if there was nothing to post. Throws if the entry doesn't
 * balance (callers construct balanced entries, so this guards logic errors).
 */
export async function postLedgerEntry(
  supabase: DB,
  orgId: string,
  params: {
    date: string;
    memo: string;
    reference?: string | null;
    source: JournalSource;
    sourceId?: string | null;
    createdBy?: string | null;
    lines: LedgerLine[];
  },
): Promise<string | null> {
  const lines = params.lines
    .map((l) => ({ ...l, debit: Math.round(l.debit * 100) / 100, credit: Math.round(l.credit * 100) / 100 }))
    .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
  if (lines.length < 2) return null;

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Ledger entry not balanced: ${totalDebit.toFixed(2)} vs ${totalCredit.toFixed(2)}`);
  }

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: orgId,
      entry_number: await nextEntryNumber(supabase, orgId),
      entry_date: params.date,
      memo: params.memo,
      reference: params.reference ?? null,
      source: params.source,
      source_id: params.sourceId ?? null,
      status: "posted",
      posted_at: new Date().toISOString(),
      created_by: params.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error || !entry) throw new Error(error?.message ?? "Could not create ledger entry.");

  const { error: linesErr } = await supabase.from("journal_lines").insert(
    lines.map((l, i) => ({
      organization_id: orgId,
      journal_entry_id: entry.id,
      account_id: l.accountId,
      description: l.description ?? null,
      debit: l.debit,
      credit: l.credit,
      line_no: i + 1,
    })),
  );
  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    throw new Error(linesErr.message);
  }
  return entry.id;
}
