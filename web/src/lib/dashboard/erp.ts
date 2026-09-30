import { loadLedger, accountBalances } from "@/lib/accounting/data";
import { loadEmployees, monthlyEquivalent } from "@/lib/hr/data";

export type ErpSnapshot = {
  accountingSetUp: boolean;
  cash: number;
  receivables: number;
  payables: number;
  netIncome: number;
  headcount: number;
  monthlyPayroll: number;
};

/**
 * Compact finance + people figures for the executive dashboard, pulled from the
 * double-entry ledger and the HR roster. Gracefully returns zeros when a module
 * hasn't been set up. Caller must gate this to management/finance roles — it
 * exposes cash position and payroll cost.
 */
export async function getErpSnapshot(orgId: string): Promise<ErpSnapshot> {
  const [ledger, employees] = await Promise.all([loadLedger(orgId), loadEmployees(orgId)]);
  const bals = accountBalances(ledger);
  const byType = (t: "income" | "expense") => bals.filter((a) => a.type === t).reduce((s, a) => s + a.balance, 0);
  const byPrefix = (prefixes: string[]) =>
    bals.filter((a) => prefixes.some((p) => a.code.startsWith(p))).reduce((s, a) => s + a.balance, 0);
  const active = employees.filter((e) => e.status !== "terminated");

  return {
    accountingSetUp: ledger.isSetUp,
    cash: byPrefix(["100", "101", "102"]), // cash + bank + mobile money accounts
    receivables: byPrefix(["110"]),
    payables: byPrefix(["200"]),
    netIncome: byType("income") - byType("expense"),
    headcount: active.length,
    monthlyPayroll: active.reduce((s, e) => s + monthlyEquivalent(e.baseSalary, e.payFrequency), 0),
  };
}
