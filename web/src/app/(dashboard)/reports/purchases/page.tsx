import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getPurchaseAnalytics, getSupplierAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Purchase Reports — Reports" };

const STATUS: Record<string, string> = { draft: "bg-surface-container-high text-on-surface-variant", pending: "bg-tertiary-container/20 text-tertiary", received: "bg-primary-container/20 text-primary", partial: "bg-secondary-container/20 text-secondary", overdue: "bg-error-container/30 text-error" };

export default async function PurchaseReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view purchase reports.</div>;

  const [p, sup] = await Promise.all([getPurchaseAnalytics(org.orgId), getSupplierAnalytics(org.orgId)]);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Purchase Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Purchase spend, trends, supplier performance and outstanding orders.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Purchases" value={compactMoney(p.total, currency)} icon="shopping_cart" tone="neutral" sub={`${p.count} orders`} />
        <Kpi label="Received" value={String(p.received)} icon="check_circle" tone="positive" />
        <Kpi label="Outstanding" value={compactMoney(p.outstandingValue, currency)} icon="pending" tone={p.outstandingValue ? "warning" : "positive"} sub={`${p.outstandingCount} open`} />
        <Kpi label="Suppliers" value={String(sup.total)} icon="local_shipping" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Purchase Spend (12 months)</h3>
          <div className="h-[280px]"><RevenueExpenseBars labels={p.byMonth.map((m) => m.label)} income={p.byMonth.map(() => 0)} expense={p.byMonth.map((m) => Math.round(m.value))} /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Supplier Performance</h3>
          <RankBars rows={sup.ranking.slice(0, 8).map((r) => ({ label: r.name, value: r.value, display: money(r.value, currency), sub: `${r.orders} orders · ${r.received} received` }))} color="#1f6f8b" />
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Purchase Orders</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">PO #</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Supplier</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Total</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {p.orders.length === 0 ? (
                <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">No purchase orders yet.</td></tr>
              ) : (
                p.orders.map((o) => (
                  <tr key={o.ref} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md font-mono text-xs text-on-surface">{o.ref}</td>
                    <td className="p-md text-on-surface-variant">{o.supplier}</td>
                    <td className="p-md text-on-surface-variant whitespace-nowrap">{o.date}</td>
                    <td className="p-md"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS[o.status] ?? "bg-surface-container-high text-on-surface-variant"}`}>{o.status}</span></td>
                    <td className="p-md text-right font-semibold tabular-nums">{money(o.total, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
