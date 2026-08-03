import { Kpi } from "@/components/finance/Kpi";
import { TrendLine } from "@/components/finance/Charts";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getCustomerAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Customer Reports — Reports" };

export default async function CustomerReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view customer reports.</div>;
  const c = await getCustomerAnalytics(org.orgId);
  const retRate = c.withOrders ? Math.round((c.returning / c.withOrders) * 100) : 0;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Customer Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Top customers, growth, retention and lifetime value.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Customers" value={String(c.total)} icon="groups" tone="neutral" />
        <Kpi label="With Orders" value={String(c.withOrders)} icon="shopping_bag" tone="positive" />
        <Kpi label="Returning" value={`${retRate}%`} icon="loyalty" tone="positive" sub={`${c.returning} repeat`} />
        <Kpi label="Avg Lifetime Value" value={money(c.avgClv, currency)} icon="diamond" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Customer Growth (new / month)</h3>
          <div className="h-[280px]"><TrendLine labels={c.growth.map((g) => g.label)} values={c.growth.map((g) => g.value)} label="New customers" /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Top Customers by Value</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Customer</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Orders</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Lifetime Value</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                {c.top.filter((t) => t.spend > 0).length === 0 ? (
                  <tr><td colSpan={3} className="p-lg text-center text-on-surface-variant">No customer sales yet.</td></tr>
                ) : (
                  c.top.filter((t) => t.spend > 0).map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-md">
                        <div className="font-medium text-on-surface">{t.name}</div>
                        <div className="font-label-md text-label-md text-on-surface-variant">{t.segment ?? "Customer"} · {t.loyalty} pts</div>
                      </td>
                      <td className="p-md text-right tabular-nums">{t.orders}</td>
                      <td className="p-md text-right font-semibold tabular-nums">{money(t.spend, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
