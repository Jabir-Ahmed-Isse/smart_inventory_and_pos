import { Kpi } from "@/components/finance/Kpi";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadLedger, incomeStatement, type StatementGroup } from "@/lib/accounting/data";

export const metadata = { title: "Profit & Loss — Inventory Pro" };

export default async function ProfitLossPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const ledger = await loadLedger(org.orgId);
  if (!ledger.isSetUp) {
    return <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full"><SeedAccountingCard /></main>;
  }
  const pl = incomeStatement(ledger);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Profit &amp; Loss</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Ledger-based income statement — built from posted journal entries, not estimates.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Revenue" value={compactMoney(pl.revenue.total, currency)} icon="trending_up" tone="positive" />
        <Kpi label="Gross Profit" value={compactMoney(pl.grossProfit, currency)} icon="savings" tone="neutral" sub={`${pl.grossMargin.toFixed(1)}% margin`} />
        <Kpi label="Operating Expenses" value={compactMoney(pl.expenses.total, currency)} icon="trending_down" tone="warning" />
        <Kpi label="Net Income" value={compactMoney(pl.netIncome, currency)} icon="account_balance_wallet" tone={pl.netIncome >= 0 ? "positive" : "negative"} sub={`${pl.netMargin.toFixed(1)}% margin`} />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden max-w-3xl">
        <Group group={pl.revenue} currency={currency} />
        <SubtotalRow label="Total Revenue" amount={pl.revenue.total} currency={currency} />

        {pl.cogs.lines.length > 0 && (
          <>
            <Group group={pl.cogs} currency={currency} />
            <SubtotalRow label="Cost of Goods Sold" amount={pl.cogs.total} currency={currency} />
            <SubtotalRow label="Gross Profit" amount={pl.grossProfit} currency={currency} strong />
          </>
        )}

        <Group group={pl.expenses} currency={currency} />
        <SubtotalRow label="Total Operating Expenses" amount={pl.expenses.total} currency={currency} />

        <div className="flex items-center justify-between px-md py-4 bg-primary-container/10 border-t-2 border-outline">
          <span className="font-headline-lg text-headline-lg text-on-surface">Net Income</span>
          <span className={`font-headline-lg text-headline-lg tabular-nums ${pl.netIncome >= 0 ? "text-primary" : "text-error"}`}>{money(pl.netIncome, currency)}</span>
        </div>
      </div>
    </main>
  );
}

function Group({ group, currency }: { group: StatementGroup; currency: string }) {
  return (
    <>
      <div className="px-md pt-4 pb-1 font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{group.title}</div>
      {group.lines.length === 0 ? (
        <div className="px-md py-2 font-body-sm text-body-sm text-on-surface-variant">None.</div>
      ) : (
        group.lines.map((l, i) => (
          <div key={`${l.code}-${i}`} className="flex items-center justify-between px-md py-1.5 hover:bg-surface-container-high/40">
            <span className="font-body-sm text-body-sm text-on-surface">
              <span className="text-on-surface-variant tabular-nums mr-2">{l.code}</span>
              {l.name}
            </span>
            <span className="font-body-sm text-body-sm tabular-nums text-on-surface">{money(l.amount, currency)}</span>
          </div>
        ))
      )}
    </>
  );
}

function SubtotalRow({ label, amount, currency, strong }: { label: string; amount: number; currency: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-md py-2 border-t border-outline-variant ${strong ? "bg-surface-container-lowest font-semibold" : ""}`}>
      <span className={`text-on-surface ${strong ? "font-body-md text-body-md" : "font-label-md text-label-md text-on-surface-variant"}`}>{label}</span>
      <span className="font-body-sm text-body-sm tabular-nums text-on-surface">{money(amount, currency)}</span>
    </div>
  );
}
