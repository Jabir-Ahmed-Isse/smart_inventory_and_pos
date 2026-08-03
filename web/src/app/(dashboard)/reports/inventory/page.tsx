import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { Donut } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { getProductsWithStock, money, compactMoney } from "@/lib/data";
import { getProductAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Inventory Reports — Reports" };

export default async function InventoryReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view inventory reports.</div>;

  const [products, prod] = await Promise.all([getProductsWithStock(org.orgId), getProductAnalytics(org.orgId)]);
  const soldSkus = new Set(prod.all.filter((p) => p.units > 0).map((p) => p.sku));

  const totalUnits = products.reduce((s, p) => s + p.qty, 0);
  const value = products.reduce((s, p) => s + p.qty * p.price, 0);
  const low = products.filter((p) => p.status === "low");
  const out = products.filter((p) => p.status === "out");
  const inStock = products.filter((p) => p.status === "in");
  const deadStock = products.filter((p) => p.qty > 0 && !soldSkus.has(p.sku));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Inventory Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Stock levels, valuation, dead stock and reorder alerts.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-md mb-lg">
        <Kpi label="Products" value={String(products.length)} icon="inventory_2" tone="neutral" />
        <Kpi label="Units on Hand" value={totalUnits.toLocaleString()} icon="functions" tone="neutral" />
        <Kpi label="Inventory Value" value={compactMoney(value, currency)} icon="savings" tone="positive" />
        <Kpi label="Low Stock" value={String(low.length)} icon="warning" tone={low.length ? "warning" : "positive"} />
        <Kpi label="Out of Stock" value={String(out.length)} icon="production_quantity_limits" tone={out.length ? "negative" : "positive"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Stock Health</h3>
          <div className="h-[200px] relative mb-md">
            <Donut labels={["In stock", "Low", "Out"]} values={[inStock.length, low.length, out.length]} colors={["#0b7a52", "#e5a05a", "#c05c6d"]} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-headline-lg text-headline-lg text-on-surface">{products.length}</span>
              <span className="font-label-md text-label-md text-on-surface-variant">products</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-label-md text-label-md">
            <div><span className="block text-primary font-bold">{inStock.length}</span> In</div>
            <div><span className="block text-tertiary font-bold">{low.length}</span> Low</div>
            <div><span className="block text-error font-bold">{out.length}</span> Out</div>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Top Stock Value</h3>
          <RankBars rows={[...products].sort((a, b) => b.qty * b.price - a.qty * a.price).slice(0, 8).map((p) => ({ label: p.name, value: p.qty * p.price, display: money(p.qty * p.price, currency), sub: `${p.qty} units` }))} />
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <div className="flex items-center gap-2 mb-md">
            <Icon name="hourglass_disabled" className="text-tertiary" />
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Dead Stock</h3>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-lg">No dead stock — everything is selling. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {deadStock.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between font-body-sm text-body-sm">
                  <span className="text-on-surface truncate">{p.name}</span>
                  <span className="text-on-surface-variant shrink-0">{p.qty} unsold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Reorder table */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex items-center gap-2">
          <Icon name="warning" className="text-error" />
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Reorder Alerts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Category</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">On Hand</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Min</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {[...out, ...low].length === 0 ? (
                <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">All stock is healthy. 🎉</td></tr>
              ) : (
                [...out, ...low].map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md text-on-surface font-medium">{p.name}</td>
                    <td className="p-md text-on-surface-variant">{p.category}</td>
                    <td className="p-md text-right tabular-nums">{p.qty}</td>
                    <td className="p-md text-right text-on-surface-variant tabular-nums">{p.minStock}</td>
                    <td className="p-md"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${p.status === "out" ? "bg-error-container/30 text-error" : "bg-tertiary-container/20 text-tertiary"}`}>{p.status === "out" ? "Out of stock" : "Low"}</span></td>
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
