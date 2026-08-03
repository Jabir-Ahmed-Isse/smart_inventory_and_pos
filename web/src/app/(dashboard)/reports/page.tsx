import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { TrendLine, RevenueExpenseBars } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { getReportsData, money, compactMoney } from "@/lib/data";
import { loadFinance, financeSummary } from "@/lib/finance/data";
import { getCustomerAnalytics, getSupplierAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Executive Dashboard — Reports" };

export default async function ExecutiveReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view reports.</div>;

  const [rep, fin, cust, sup] = await Promise.all([
    getReportsData(org.orgId),
    loadFinance(org.orgId).then(financeSummary),
    getCustomerAnalytics(org.orgId),
    getSupplierAnalytics(org.orgId),
  ]);

  const months = fin.months.map((m) => m.label);
  const revSeries = fin.months.map((m) => Math.round(m.income));
  const profitSeries = fin.months.map((m) => Math.round(m.income - m.expense));
  const margin = rep.revenue > 0 ? Math.round((fin.netProfit / rep.revenue) * 100) : 0;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Executive Dashboard</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Business intelligence across sales, inventory, customers and finance.</p>
        </div>
        <Link href="/reports/custom" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md self-start">
          <Icon name="download" size={16} /> Build a report
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-md mb-lg">
        <Kpi label="Revenue" value={compactMoney(rep.revenue, currency)} icon="payments" tone="positive" />
        <Kpi label="Profit" value={compactMoney(fin.netProfit, currency)} icon="account_balance_wallet" tone={fin.netProfit >= 0 ? "positive" : "negative"} sub={`${margin}%`} />
        <Kpi label="Expenses" value={compactMoney(rep.expenses, currency)} icon="receipt_long" tone="warning" />
        <Kpi label="Orders" value={String(rep.orders)} icon="shopping_bag" tone="neutral" />
        <Kpi label="Inventory" value={compactMoney(rep.inventoryValue, currency)} icon="inventory_2" tone="neutral" />
        <Kpi label="Customers" value={String(cust.total)} icon="groups" tone="neutral" />
        <Kpi label="Suppliers" value={String(sup.total)} icon="local_shipping" tone="neutral" />
        <Kpi label="Low Stock" value={String(rep.lowStockCount)} icon="warning" tone={rep.lowStockCount > 0 ? "negative" : "positive"} />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Revenue Trend</h3>
          <div className="h-[280px]"><TrendLine labels={months} values={revSeries} label="Revenue" /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Profit Trend</h3>
          <div className="h-[280px]"><TrendLine labels={months} values={profitSeries} label="Profit" color="#1f6f8b" /></div>
        </div>
      </div>

      {/* Rev vs exp + top products + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Revenue vs Expenses</h3>
          <div className="h-[240px]"><RevenueExpenseBars labels={months} income={fin.months.map((m) => Math.round(m.income))} expense={fin.months.map((m) => Math.round(m.expense))} /></div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Top Products by Value</h3>
          <RankBars rows={rep.topProducts.map((p) => ({ label: p.name, value: p.value, display: money(p.value, currency), sub: `${p.qty} in stock` }))} />
        </div>

        <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/10 border border-primary/20 rounded-xl p-md shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-md">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="auto_awesome" filled /></div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">AI Business Summary</h3>
          </div>
          <ul className="space-y-3 flex-1 font-body-sm text-body-sm text-on-surface">
            <Line icon="ecg_heart">Net margin is <b>{margin}%</b> — {margin >= 15 ? "strong profitability." : margin >= 5 ? "steady, watch costs." : "thin, review pricing."}</Line>
            <Line icon="groups">{cust.returning} of {cust.total} customers are repeat buyers.</Line>
            {rep.lowStockCount > 0 && <Line icon="warning">{rep.lowStockCount} product(s) need reordering soon.</Line>}
            {rep.topProducts[0] && <Line icon="emoji_events">{rep.topProducts[0].name} holds the most inventory value.</Line>}
          </ul>
          <Link href="/reports/ai" className="mt-md text-center py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors">Open AI Insights</Link>
        </div>
      </div>
    </main>
  );
}

function Line({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={icon} size={18} className="text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
