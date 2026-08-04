import { createClient } from "@/lib/supabase/server";

export type AccountKind = "bank" | "mobile" | "cash";

export type AccountLite = { id: string; name: string; kind: AccountKind };

export type AccountWithBalance = AccountLite & {
  provider: string | null;
  isActive: boolean;
  openingBalance: number;
  inflow: number;
  outflow: number;
  balance: number;
  txnCount: number;
};

/**
 * All money accounts for an org with a computed running balance:
 *   balance = opening_balance + Σ(income to it) − Σ(expense from it)
 * Tolerant of a missing table (returns []) so the UI degrades gracefully
 * before the payment_accounts migration is applied.
 */
export async function getAccountsWithBalance(orgId: string): Promise<AccountWithBalance[]> {
  const supabase = await createClient();
  const [accRes, txRes] = await Promise.all([
    supabase
      .from("payment_accounts")
      .select("id, name, kind, provider, is_active, opening_balance")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("account_id, type, amount")
      .eq("organization_id", orgId)
      .not("account_id", "is", null),
  ]);

  if (accRes.error || !accRes.data) return [];

  const agg = new Map<string, { inflow: number; outflow: number; count: number }>();
  for (const t of txRes.data ?? []) {
    if (!t.account_id) continue;
    const a = agg.get(t.account_id) ?? { inflow: 0, outflow: 0, count: 0 };
    if (t.type === "income") a.inflow += Number(t.amount);
    else a.outflow += Number(t.amount);
    a.count += 1;
    agg.set(t.account_id, a);
  }

  return accRes.data.map((a) => {
    const m = agg.get(a.id) ?? { inflow: 0, outflow: 0, count: 0 };
    const opening = Number(a.opening_balance);
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      provider: a.provider,
      isActive: a.is_active,
      openingBalance: opening,
      inflow: m.inflow,
      outflow: m.outflow,
      balance: Math.round((opening + m.inflow - m.outflow) * 100) / 100,
      txnCount: m.count,
    };
  });
}

/** Active accounts only — for payment pickers in POS / order settlement. */
export async function getActiveAccounts(orgId: string): Promise<AccountLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_accounts")
    .select("id, name, kind")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data;
}
