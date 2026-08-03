import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, Donut } from "@/components/finance/Charts";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, expenseAnalytics } from "@/lib/finance/data";
import { RecordTransactionDialog } from "@/components/finance/RecordTransactionDialog";

export const metadata = { title: "Expenses — Inventory Pro" };

const COLORS = ["#e5a05a", "#c05c6d", "#1f6f8b", "#8a5cf6", "#0b7a52", "#cfd8d1"];

export default async function ExpensesPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const a = raw ? expenseAnalytics(raw) : null;

  if (!a) return <div className="p-xl text-center text-on-surface-variant">Sign in to view expenses.</div>;

  const zeros = a.months.map(() => 0);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Expenses</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Where money goes — categories, trends and month-over-month.</p>
        </div>
        <RecordTransactionDialog defaultType="expense" triggerLabel="Record Expense" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Expenses" value={compactMoney(a.total, currency)} icon="receipt_long" tone="warning" />
        <Kpi label="This Month" value={money(a.thisMonth, currency)} icon="calendar_month" tone="neutral" />
        <Kpi label="Last Month" value={money(a.lastMonth, currency)} icon="history" tone="neutral" />
        <Kpi
          label="MoM Change"
          value={`${a.change > 0 ? "+" : ""}${a.change}%`}
          icon={a.change > 0 ? "trending_up" : "trending_down"}
          tone={a.change > 0 ? "negative" : "positive"}
          sub="vs last month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Monthly Expense Trend</h3>
          <div className="h-[300px]">
            <RevenueExpenseBars labels={a.months.map((m) => m.label)} income={zeros} expense={a.months.map((m) => m.amount)} />
          </div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">By Category</h3>
          {a.categories.length === 0 ? (
            <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-lg">No expenses yet.</p>
          ) : (
            <>
              <div className="h-[170px] relative mb-md">
                <Donut labels={a.categories.map((c) => c.category)} values={a.categories.map((c) => c.amount)} colors={COLORS} />
              </div>
              <ul className="space-y-2">
                {a.categories.map((c, i) => (
                  <li key={c.category} className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="flex items-center gap-2 text-on-surface">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.category}
                    </span>
                    <span className="text-on-surface-variant">{money(c.amount, currency)} · {c.pct}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-lg">
        <div className="p-md border-b border-outline-variant"><h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Expenses</h3></div>
        <div className="divide-y divide-outline-variant/60">
          {a.recent.length === 0 ? (
            <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No expenses yet.</p>
          ) : (
            a.recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-error-container/30 text-error flex items-center justify-center shrink-0"><Icon name="north_east" size={16} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-sm text-body-sm text-on-surface truncate">{t.description ?? t.category ?? "—"}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {t.category ?? "—"}</p>
                </div>
                <span className="font-body-sm text-body-sm font-semibold text-error">−{money(t.amount, currency)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
