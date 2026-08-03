import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getPurchaseAnalytics, getSupplierAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Purchase Analytics — Inventory Pro" };

export default async function PurchaseAnalyticsPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view purchase analytics.</div>;
  const [p, sup] = await Promise.all([getPurchaseAnalytics(org.orgId), getSupplierAnalytics(org.orgId)]);
  const avgCost = p.count ? p.total / p.count : 0;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Purchase Analytics</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Spend trends, supplier analysis and procurement performance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Purchase Value" value={compactMoney(p.total, currency)} icon="payments" tone="neutral" sub={`${p.count} orders`} />
        <Kpi label="Suppliers" value={String(sup.total)} icon="storefront" tone="neutral" />
        <Kpi label="Avg Order Cost" value={money(avgCost, currency)} icon="insights" tone="neutral" />
        <Kpi label="Outstanding" value={compactMoney(p.outstandingValue, currency)} icon="pending" tone={p.outstandingValue ? "negative" : "positive"} sub={`${p.outstandingCount} open`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Purchase Spend Trend</h3>
          <div className="h-[280px]"><TrendLine labels={p.byMonth.map((m) => m.label)} values={p.byMonth.map((m) => Math.round(m.value))} label="Spend" color="#1f6f8b" /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Monthly Spend</h3>
          <div className="h-[280px]"><RevenueExpenseBars labels={p.byMonth.map((m) => m.label)} income={p.byMonth.map(() => 0)} expense={p.byMonth.map((m) => Math.round(m.value))} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Top Suppliers by Spend</h3>
          <RankBars rows={sup.ranking.slice(0, 8).map((r) => ({ label: r.name, value: r.value, display: money(r.value, currency), sub: `${r.orders} orders · ${r.received} received` }))} emptyText="No supplier spend yet." color="#1f6f8b" />
        </div>
        <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/10 border border-primary/20 rounded-xl p-md shadow-sm">
          <div className="flex items-center gap-2 mb-md"><div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="auto_awesome" filled /></div><h3 className="font-headline-lg text-headline-lg text-on-surface">AI Purchasing Assistant</h3></div>
          <ul className="space-y-3 font-body-sm text-body-sm text-on-surface">
            {sup.ranking[0] && <li className="flex gap-2"><Icon name="workspace_premium" size={18} className="text-primary shrink-0 mt-0.5" /><span>Best supplier: <b>{sup.ranking[0].name}</b> ({money(sup.ranking[0].value, currency)}).</span></li>}
            {p.outstandingCount > 0 && <li className="flex gap-2"><Icon name="schedule" size={18} className="text-primary shrink-0 mt-0.5" /><span>{p.outstandingCount} order(s) still open — follow up to avoid stockouts.</span></li>}
            <li className="flex gap-2"><Icon name="trending_up" size={18} className="text-primary shrink-0 mt-0.5" /><span>Next-month spend projected ≈ <b>{compactMoney(avgCost * Math.max(1, Math.round(p.count / 12)), currency)}</b> at current run-rate.</span></li>
            <li className="flex gap-2"><Icon name="savings" size={18} className="text-primary shrink-0 mt-0.5" /><span>Negotiate volume pricing with your top supplier to cut unit costs.</span></li>
          </ul>
        </div>
      </div>
    </main>
  );
}
