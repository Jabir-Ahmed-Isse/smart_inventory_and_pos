import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NewBudgetDialog } from "@/components/budgets/BudgetDialogs";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadLedger } from "@/lib/accounting/data";
import { loadBudgets } from "@/lib/budgets/data";

export const metadata = { title: "Budgets — Inventory Pro" };

export default async function BudgetsPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const ledger = await loadLedger(org.orgId);
  if (!ledger.isSetUp) {
    return <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full"><SeedAccountingCard /></main>;
  }

  const budgets = await loadBudgets(org.orgId);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Budgets</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Set annual targets by account and track actuals against them.</p>
        </div>
        <NewBudgetDialog />
      </div>

      {budgets.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="savings" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No budgets yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Create a budget, then add a target for each account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {budgets.map((b) => (
            <Link key={b.id} href={`/accounting/budgets/${b.id}`} className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm hover:bg-surface-container-high/40 transition-colors group">
              <div className="flex items-start justify-between mb-md">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="savings" size={20} filled /></div>
                <span className="font-label-md text-label-md text-on-surface-variant">FY {b.fiscalYear}</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{b.name}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">{b.lineCount} account{b.lineCount === 1 ? "" : "s"} · {money(b.totalBudget, currency)} budgeted</p>
              <span className="inline-flex items-center gap-1 text-primary font-label-md text-label-md mt-md group-hover:gap-2 transition-all">Open <Icon name="arrow_forward" size={14} /></span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
