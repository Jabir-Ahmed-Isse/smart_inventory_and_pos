import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine, Donut } from "@/components/finance/Charts";
import { RecordTransactionDialog } from "@/components/finance/RecordTransactionDialog";
import { SyncLedgerButton } from "@/components/finance/SyncLedgerButton";
import { getActiveOrg } from "@/lib/org";
import { getActiveBranchId } from "@/lib/branches/context";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, financeSummary } from "@/lib/finance/data";
import { getActiveAccounts } from "@/lib/accounts/data";

export const metadata = { title: "Finance Overview — Inventory Pro" };

export default async function FinanceOverviewPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const branchId = await getActiveBranchId();
  const [raw, accounts] = org
    ? await Promise.all([loadFinance(org.orgId, branchId), getActiveAccounts(org.orgId)])
    : [null, []];
  const s = raw ? financeSummary(raw) : null;

  if (!s) {
    return <div className="p-xl text-center text-on-surface-variant">Sign in to view finance.</div>;
  }

  const margin = s.revenue > 0 ? Math.round((s.netProfit / s.revenue) * 100) : 0;
  const trend = s.cashFlow;
  const lastNet = trend[trend.length - 1]?.net ?? 0;
  const prevNet = trend[trend.length - 2]?.net ?? 0;
  const cashUp = lastNet >= prevNet;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Financial Overview</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Executive view of revenue, profitability and cash across your business.
          </p>
        </div>
        <div className="flex items-center gap-sm self-start">
          <SyncLedgerButton />
          <Link href="/accounting/journal" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="menu_book" size={16} /> Journal
          </Link>
          <RecordTransactionDialog accounts={accounts} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md mb-lg">
        <Kpi label="Total Revenue" value={compactMoney(s.revenue, currency)} icon="payments" tone="positive" />
        <Kpi label="Total Expenses" value={compactMoney(s.expenses, currency)} icon="receipt_long" tone="warning" />
        <Kpi label="Net Profit" value={compactMoney(s.netProfit, currency)} icon="account_balance_wallet" tone={s.netProfit >= 0 ? "positive" : "negative"} sub={`${margin}% margin`} />
        <Kpi label="Cash Balance" value={compactMoney(s.cashBalance, currency)} icon="savings" tone="neutral" trend={{ dir: cashUp ? "up" : "down", label: "this month" }} />
        <Kpi label="Receivables" value={compactMoney(s.receivables, currency)} icon="call_received" tone={s.receivables > 0 ? "warning" : "neutral"} sub="owed to you" />
        <Kpi label="Payables" value={compactMoney(s.payables, currency)} icon="call_made" tone={s.payables > 0 ? "negative" : "neutral"} sub="you owe" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Revenue vs Expenses</h3>
          <div className="h-[300px]">
            <RevenueExpenseBars labels={s.months.map((m) => m.label)} income={s.months.map((m) => m.income)} expense={s.months.map((m) => m.expense)} />
          </div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Cash Flow</h3>
          <div className="h-[300px]">
            <TrendLine labels={s.cashFlow.map((m) => m.label)} values={s.cashFlow.map((m) => m.cumulative)} label="Cumulative cash" />
          </div>
        </div>
      </div>

      {/* Breakdown + recent + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Expense breakdown */}
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Expense Breakdown</h3>
          {s.expenseBreakdown.length === 0 ? (
            <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-lg">No expenses yet.</p>
          ) : (
            <>
              <div className="h-[180px] relative mb-md">
                <Donut labels={s.expenseBreakdown.map((b) => b.category)} values={s.expenseBreakdown.map((b) => b.amount)} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-label-md text-label-md text-on-surface-variant">Total</span>
                  <span className="font-headline-lg text-headline-lg text-on-surface">{compactMoney(s.expenses, currency)}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {s.expenseBreakdown.slice(0, 5).map((b, i) => (
                  <li key={b.category} className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="flex items-center gap-2 text-on-surface">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: ["#0b7a52", "#1f6f8b", "#e5a05a", "#8a5cf6", "#c05c6d"][i] }} />
                      {b.category}
                    </span>
                    <span className="text-on-surface-variant">{money(b.amount, currency)} · {b.pct}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-md border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Transactions</h3>
            <Link href="/accounting/journal" className="text-primary font-label-md text-label-md hover:underline">View all</Link>
          </div>
          <div className="flex-1 divide-y divide-outline-variant/60">
            {s.recent.length === 0 ? (
              <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No transactions yet.</p>
            ) : (
              s.recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-primary-container/20 text-primary" : "bg-error-container/30 text-error"}`}>
                    <Icon name={t.type === "income" ? "south_west" : "north_east"} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body-sm text-body-sm text-on-surface truncate">{t.description ?? t.category ?? "—"}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">{t.category ?? "—"}</p>
                  </div>
                  <span className={`font-body-sm text-body-sm font-semibold ${t.type === "income" ? "text-primary" : "text-error"}`}>
                    {t.type === "income" ? "+" : "−"}{money(t.amount, currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI insights */}
        <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/10 border border-primary/20 rounded-xl p-md shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-md">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="auto_awesome" filled />
            </div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">AI Financial Insights</h3>
          </div>
          <ul className="space-y-3 flex-1">
            <Insight icon="ecg_heart" text={`Business health looks ${margin >= 20 ? "strong" : margin >= 5 ? "steady" : "tight"} — net margin is ${margin}%.`} />
            <Insight icon={cashUp ? "trending_up" : "trending_down"} text={`Cash flow is ${cashUp ? "improving" : "softening"} vs last month.`} />
            {s.receivables > 0 && <Insight icon="schedule" text={`${compactMoney(s.receivables, currency)} is owed to you — chase receivables to free up cash.`} />}
            {s.expenseBreakdown[0] && <Insight icon="savings" text={`${s.expenseBreakdown[0].category} is your biggest cost at ${s.expenseBreakdown[0].pct}% of spend.`} />}
          </ul>
          <Link href="/ai" className="mt-md text-center py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors">
            Open AI Intelligence
          </Link>
        </div>
      </div>
    </main>
  );
}

function Insight({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface">
      <Icon name={icon} size={18} className="text-primary shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}
