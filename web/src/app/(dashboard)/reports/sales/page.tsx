import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, Donut } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getSalesAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Sales Reports — Reports" };

const PAY = { cash: "Cash", card: "Card", mobile: "Mobile", credit: "Credit" } as const;

export default async function SalesReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view sales reports.</div>;
  const s = await getSalesAnalytics(org.orgId);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Sales Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Sales performance by period, product, category and payment method.</p>
      </div>

      {/* Period totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Today" value={money(s.today, currency)} icon="today" tone="positive" />
        <Kpi label="This Week" value={money(s.week, currency)} icon="date_range" tone="neutral" />
        <Kpi label="This Month" value={money(s.month, currency)} icon="calendar_month" tone="neutral" />
        <Kpi label="This Year" value={compactMoney(s.year, currency)} icon="event" tone="neutral" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Revenue" value={compactMoney(s.revenue, currency)} icon="payments" tone="positive" sub={`${s.orders} orders`} />
        <Kpi label="Avg Order Value" value={money(s.avgOrder, currency)} icon="shopping_bag" tone="neutral" />
        <Kpi label="Discounts" value={money(s.discounts, currency)} icon="percent" tone="warning" />
        <Kpi label="Returns" value={money(s.returns.value, currency)} icon="keyboard_return" tone={s.returns.value > 0 ? "negative" : "neutral"} sub={`${s.returns.count} refunded`} />
      </div>

      {/* Trend */}
      <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm mb-lg">
        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Monthly Sales (12 months)</h3>
        <div className="h-[300px]"><RevenueExpenseBars labels={s.byMonth.map((m) => m.label)} income={s.byMonth.map((m) => Math.round(m.value))} expense={s.byMonth.map(() => 0)} /></div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Sales by Product</h3>
          <RankBars rows={s.byProduct.map((p) => ({ label: p.name, value: p.revenue, display: money(p.revenue, currency), sub: `${p.qty} sold` }))} />
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Sales by Category</h3>
          {s.byCategory.length === 0 ? (
            <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-lg">No sales yet.</p>
          ) : (
            <>
              <div className="h-[180px] relative mb-md"><Donut labels={s.byCategory.map((c) => c.name)} values={s.byCategory.map((c) => Math.round(c.revenue))} /></div>
              <RankBars rows={s.byCategory.slice(0, 5).map((c) => ({ label: c.name, value: c.revenue, display: money(c.revenue, currency) }))} />
            </>
          )}
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">By Payment Method</h3>
          <ul className="space-y-3">
            {s.byPayment.map((m) => {
              const pct = s.revenue > 0 ? Math.round((m.amount / s.revenue) * 100) : 0;
              return (
                <li key={m.method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                      <Icon name={m.method === "cash" ? "payments" : m.method === "card" ? "credit_card" : m.method === "mobile" ? "smartphone" : "schedule"} size={16} className="text-primary" />
                      {PAY[m.method as keyof typeof PAY]}
                    </span>
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">{money(m.amount, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">{m.count} orders · {pct}%</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
