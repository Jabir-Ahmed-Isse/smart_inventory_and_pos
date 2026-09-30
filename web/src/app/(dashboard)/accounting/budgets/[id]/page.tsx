import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SetBudgetLineDialog } from "@/components/budgets/BudgetDialogs";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadAccounts } from "@/lib/accounting/data";
import { loadBudget } from "@/lib/budgets/data";

export const metadata = { title: "Budget — Inventory Pro" };

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const { id } = await params;
  const [data, accounts] = await Promise.all([loadBudget(org.orgId, id), loadAccounts(org.orgId)]);
  if (!data) notFound();
  const { budget, lines } = data;
  const currency = org.currency;

  const accountOpts = accounts
    .filter((a) => a.type === "income" || a.type === "expense")
    .map((a) => ({ id: a.id, label: `${a.code} · ${a.name}` }));

  const totalActual = lines.reduce((s, l) => s + l.actual, 0);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <Link href="/accounting/budgets" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-md text-label-md mb-md">
        <Icon name="arrow_back" size={16} /> Budgets
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">{budget.name}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Fiscal year {budget.fiscalYear} · {money(budget.totalBudget, currency)} budgeted · {money(totalActual, currency)} actual to date</p>
        </div>
        <SetBudgetLineDialog budgetId={budget.id} accounts={accountOpts} />
      </div>

      {lines.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="savings" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No budget lines yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Add a target amount for each income or expense account.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-md py-3 font-medium">Account</th>
                  <th className="px-md py-3 font-medium text-right">Budget</th>
                  <th className="px-md py-3 font-medium text-right">Actual</th>
                  <th className="px-md py-3 font-medium text-right">Variance</th>
                  <th className="px-md py-3 font-medium w-40">Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {lines.map((l) => {
                  // Over-budget expense is bad (red); over-target income is good (green).
                  const good = l.type === "income" ? l.variance >= 0 : l.variance <= 0;
                  const barTone = l.usedPct > 100 && l.type === "expense" ? "bg-error" : "bg-primary";
                  return (
                    <tr key={l.accountId} className="hover:bg-surface-container-high/40">
                      <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">
                        <span className="text-on-surface-variant tabular-nums mr-2">{l.code}</span>{l.name}
                        <span className="ml-2 font-label-md text-label-md text-on-surface-variant capitalize">{l.type}</span>
                      </td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(l.budget, currency)}</td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(l.actual, currency)}</td>
                      <td className={`px-md py-3 font-body-sm text-body-sm text-right tabular-nums font-medium ${good ? "text-primary" : "text-error"}`}>
                        {l.variance >= 0 ? "+" : "−"}{money(Math.abs(l.variance), currency)}
                      </td>
                      <td className="px-md py-3">
                        <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                          <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.min(100, Math.max(0, l.usedPct))}%` }} />
                        </div>
                        <span className="font-label-md text-label-md text-on-surface-variant">{l.usedPct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
