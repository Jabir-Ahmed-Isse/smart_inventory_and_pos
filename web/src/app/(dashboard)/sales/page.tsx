import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine, Donut } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { money, compactMoney } from "@/lib/data";
import { getSalesOverview, SALES_STATUS_META, PAY_LABEL } from "@/lib/sales/data";

export const metadata = { title: "Sales Overview — Inventory Pro" };

const PAY_COLORS = ["#0b7a52", "#1f6f8b", "#e5a05a", "#8a5cf6"];

export default async function SalesOverviewPage() {
  await requireRole(["owner", "admin", "manager", "accountant"]);
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view sales.</div>;

  const o = await getSalesOverview(org.orgId);
  const k = o.kpis;
  const a = o.analytics;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      {/* Header + actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Sales</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Revenue command centre — orders, payments, customers and performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <Link href="/pos" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
            <Icon name="point_of_sale" size={16} /> New Sale
          </Link>
          <Link href="/orders" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="receipt_long" size={16} /> View Orders
          </Link>
          <Link href="/sales/returns" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="keyboard_return" size={16} /> Returns
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Revenue" value={compactMoney(k.revenue, currency)} icon="payments" tone="positive" sub={`${k.orders} orders`} />
        <Kpi label="Today's Sales" value={money(k.todayTotal, currency)} icon="today" tone="neutral" sub={`${k.todayCount} order(s)`} />
        <Kpi label="Avg Order Value" value={money(k.avgOrder, currency)} icon="shopping_bag" tone="neutral" />
        <Kpi label="Collected" value={compactMoney(k.collected, currency)} icon="paid" tone="positive" />
        <Kpi label="Amount Due" value={money(k.dueTotal, currency)} icon="account_balance_wallet" tone={k.dueTotal ? "warning" : "positive"} sub={`${k.dueCount} unpaid`} />
        <Kpi label="Discounts Given" value={money(k.discounts, currency)} icon="percent" tone="neutral" />
        <Kpi label="Refunds" value={money(k.returnsValue, currency)} icon="keyboard_return" tone={k.returnsValue ? "negative" : "neutral"} sub={`${k.returnsCount} refunded`} />
        <Kpi label="This Month" value={compactMoney(a.month, currency)} icon="calendar_month" tone="neutral" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Monthly Sales</h3>
          <div className="h-[280px]"><RevenueExpenseBars labels={a.byMonth.map((m) => m.label)} income={a.byMonth.map((m) => Math.round(m.value))} expense={a.byMonth.map(() => 0)} /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Payment Methods</h3>
          <div className="h-[180px] relative mb-md">
            <Donut labels={a.byPayment.map((p) => PAY_LABEL[p.method] ?? p.method)} values={a.byPayment.map((p) => Math.round(p.amount))} colors={PAY_COLORS} />
          </div>
          <div className="grid grid-cols-2 gap-2 font-label-md text-label-md">
            {a.byPayment.map((p, i) => (
              <span key={p.method} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} /> {PAY_LABEL[p.method] ?? p.method} {p.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Sales Trend (12 months)</h3>
          <div className="h-[240px]"><TrendLine labels={a.byMonth.map((m) => m.label)} values={a.byMonth.map((m) => Math.round(m.value))} label="Sales" color="#0b7a52" /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Top Products</h3>
          <RankBars rows={a.byProduct.slice(0, 6).map((p) => ({ label: p.name, value: p.revenue, display: money(p.revenue, currency), sub: `${p.qty} sold` }))} emptyText="No sales yet." />
        </div>
      </div>

      {/* Recent orders + AI */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <div className="xl:col-span-2 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Orders</h3>
            <Link href="/orders" className="text-primary font-label-md text-label-md hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Order</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Customer</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Payment</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Total</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                {o.recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">No sales yet. Ring one up at the Point of Sale.</td></tr>
                ) : (
                  o.recentOrders.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-md font-mono text-xs text-on-surface">{r.orderNumber}</td>
                      <td className="p-md text-on-surface-variant">{r.customerName}</td>
                      <td className="p-md text-on-surface-variant">{r.paymentMethod ? PAY_LABEL[r.paymentMethod] : "—"}</td>
                      <td className="p-md">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${r.isDue ? "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30" : SALES_STATUS_META[r.status]?.cls ?? ""}`}>
                          {r.isDue ? "Due" : SALES_STATUS_META[r.status]?.label ?? r.status}
                        </span>
                      </td>
                      <td className="p-md text-right font-semibold tabular-nums">{money(r.total, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI insights */}
        <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/10 border border-primary/20 rounded-xl p-md shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-md">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="auto_awesome" filled /></div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">AI Sales Insights</h3>
          </div>
          <ul className="space-y-3 flex-1 font-body-sm text-body-sm text-on-surface">
            {a.byProduct[0] && <AiLine icon="local_fire_department">{a.byProduct[0].name} is your best seller at {money(a.byProduct[0].revenue, currency)} across {a.byProduct[0].qty} units.</AiLine>}
            {k.dueTotal > 0 && <AiLine icon="schedule">{money(k.dueTotal, currency)} is owed across {k.dueCount} unpaid order(s) — follow up to collect.</AiLine>}
            {a.byCategory[0] && <AiLine icon="category">{a.byCategory[0].name} leads category sales ({money(a.byCategory[0].revenue, currency)}).</AiLine>}
            <AiLine icon="trending_up">Average order value is {money(k.avgOrder, currency)} — bundle add-ons at checkout to lift it.</AiLine>
          </ul>
        </div>
      </div>
    </main>
  );
}

function AiLine({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={icon} size={18} className="text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
