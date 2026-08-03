import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine, Donut } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getSalesAnalytics } from "@/lib/reports/data";
import { PAY_LABEL } from "@/lib/sales/data";

export const metadata = { title: "Sales Analytics — Inventory Pro" };

const PAY_COLORS = ["#0b7a52", "#1f6f8b", "#e5a05a", "#8a5cf6"];

export default async function SalesAnalyticsPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view sales analytics.</div>;

  const s = await getSalesAnalytics(org.orgId);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Sales Analytics</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Performance by period, product, category and payment method.</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Sales by Product</h3>
          <RankBars rows={s.byProduct.map((p) => ({ label: p.name, value: p.revenue, display: money(p.revenue, currency), sub: `${p.qty} sold` }))} emptyText="No sales yet." />
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Sales by Category</h3>
          <RankBars rows={s.byCategory.map((c) => ({ label: c.name, value: c.revenue, display: money(c.revenue, currency), sub: `${c.qty} sold` }))} emptyText="No sales yet." />
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Payment Methods</h3>
          <div className="h-[180px] relative mb-md">
            <Donut labels={s.byPayment.map((p) => PAY_LABEL[p.method] ?? p.method)} values={s.byPayment.map((p) => Math.round(p.amount))} colors={PAY_COLORS} />
          </div>
          <div className="grid grid-cols-2 gap-2 font-label-md text-label-md">
            {s.byPayment.map((p, i) => (
              <span key={p.method} className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} /> {PAY_LABEL[p.method] ?? p.method}</span>
                <span className="tabular-nums text-on-surface-variant">{money(p.amount, currency)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Yearly trend */}
      {s.byYear.length > 1 && (
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Yearly Sales</h3>
          <div className="h-[240px]"><TrendLine labels={s.byYear.map((y) => y.year)} values={s.byYear.map((y) => Math.round(y.value))} label="Sales" color="#1f6f8b" /></div>
        </div>
      )}
    </main>
  );
}
