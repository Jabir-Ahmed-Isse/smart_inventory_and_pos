import { createClient } from "@/lib/supabase/server";
import { loadLedger, accountBalances } from "@/lib/accounting/data";
import type { AccountType } from "@/lib/supabase/database.types";

export type BudgetSummary = { id: string; name: string; fiscalYear: number; lineCount: number; totalBudget: number };

export type BudgetLine = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  budget: number;
  actual: number;
  variance: number;   // actual - budget
  usedPct: number;
};

export async function loadBudgets(orgId: string): Promise<BudgetSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budgets")
    .select("id, name, fiscal_year, budget_lines(annual_amount)")
    .eq("organization_id", orgId)
    .order("fiscal_year", { ascending: false });

  return ((data ?? []) as unknown as { id: string; name: string; fiscal_year: number; budget_lines: { annual_amount: number }[] }[]).map((b) => ({
    id: b.id,
    name: b.name,
    fiscalYear: b.fiscal_year,
    lineCount: b.budget_lines?.length ?? 0,
    totalBudget: (b.budget_lines ?? []).reduce((s, l) => s + l.annual_amount, 0),
  }));
}

export async function loadBudget(orgId: string, id: string): Promise<{ budget: BudgetSummary; lines: BudgetLine[] } | null> {
  const supabase = await createClient();
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, name, fiscal_year")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!budget) return null;

  const [{ data: rawLines }, ledger] = await Promise.all([
    supabase.from("budget_lines").select("account_id, annual_amount").eq("organization_id", orgId).eq("budget_id", id),
    loadLedger(orgId),
  ]);

  const balances = accountBalances(ledger);
  const balById = new Map(balances.map((b) => [b.id, b]));

  const lines: BudgetLine[] = ((rawLines ?? []) as { account_id: string; annual_amount: number }[]).map((l) => {
    const acc = balById.get(l.account_id);
    const actual = acc?.balance ?? 0;
    const budget = l.annual_amount;
    return {
      accountId: l.account_id,
      code: acc?.code ?? "—",
      name: acc?.name ?? "Unknown",
      type: acc?.type ?? "expense",
      budget,
      actual,
      variance: Math.round((actual - budget) * 100) / 100,
      usedPct: budget > 0 ? Math.round((actual / budget) * 100) : 0,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  return {
    budget: { id: budget.id, name: budget.name, fiscalYear: budget.fiscal_year, lineCount: lines.length, totalBudget: lines.reduce((s, l) => s + l.budget, 0) },
    lines,
  };
}
