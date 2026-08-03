import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getProductAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Product Reports — Reports" };

export default async function ProductReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view product reports.</div>;
  const p = await getProductAnalytics(org.orgId);

  const totalRevenue = p.all.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = p.all.reduce((s, r) => s + r.profit, 0);
  const unitsSold = p.all.reduce((s, r) => s + r.units, 0);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Product Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Best sellers, most profitable and slow-moving products.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Products Sold" value={String(p.all.length)} icon="category" tone="neutral" />
        <Kpi label="Units Sold" value={unitsSold.toLocaleString()} icon="shopping_bag" tone="neutral" />
        <Kpi label="Revenue" value={compactMoney(totalRevenue, currency)} icon="payments" tone="positive" />
        <Kpi label="Gross Profit" value={compactMoney(totalProfit, currency)} icon="trending_up" tone="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <ProductList title="Best Selling" icon="emoji_events" rows={p.bestSelling} currency={currency} metric="units" />
        <ProductList title="Most Profitable" icon="savings" rows={p.mostProfitable} currency={currency} metric="profit" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-lg">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex items-center gap-2">
          <Icon name="trending_down" className="text-tertiary" />
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Slow Moving Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Units Sold</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Revenue</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {p.slowMoving.length === 0 ? (
                <tr><td colSpan={4} className="p-lg text-center text-on-surface-variant">No sales data yet.</td></tr>
              ) : (
                p.slowMoving.map((r) => (
                  <tr key={r.sku} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md"><div className="font-medium text-on-surface">{r.name}</div><div className="font-label-md text-label-md text-on-surface-variant">{r.sku}</div></td>
                    <td className="p-md text-right tabular-nums">{r.units}</td>
                    <td className="p-md text-right tabular-nums">{money(r.revenue, currency)}</td>
                    <td className="p-md text-right tabular-nums text-on-surface-variant">{Math.round(r.margin)}%</td>
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

function ProductList({ title, icon, rows, currency, metric }: { title: string; icon: string; rows: { name: string; sku: string; units: number; revenue: number; profit: number; margin: number }[]; currency: string; metric: "units" | "profit" }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex items-center gap-2">
        <Icon name={icon} className="text-primary" />
        <h3 className="font-headline-lg text-headline-lg text-on-surface">{title}</h3>
      </div>
      <div className="divide-y divide-outline-variant/60">
        {rows.filter((r) => r.units > 0).length === 0 ? (
          <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No sales yet.</p>
        ) : (
          rows.filter((r) => r.units > 0).map((r, i) => (
            <div key={r.sku} className="flex items-center gap-3 p-3">
              <span className="w-6 h-6 rounded-full bg-primary-container/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-body-sm text-body-sm text-on-surface truncate">{r.name}</p>
                <p className="font-label-md text-label-md text-on-surface-variant">{r.units} sold · {money(r.revenue, currency)}</p>
              </div>
              <span className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">
                {metric === "units" ? `${r.units}` : money(r.profit, currency)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
