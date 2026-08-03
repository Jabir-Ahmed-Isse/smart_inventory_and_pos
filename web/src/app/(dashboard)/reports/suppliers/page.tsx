import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getSupplierAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Supplier Reports — Reports" };

export default async function SupplierReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view supplier reports.</div>;
  const s = await getSupplierAnalytics(org.orgId);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Supplier Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Supplier ranking, purchase value, delivery and outstanding bills.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Suppliers" value={String(s.total)} icon="local_shipping" tone="neutral" />
        <Kpi label="Total Purchase Value" value={compactMoney(s.totalValue, currency)} icon="shopping_cart" tone="neutral" />
        <Kpi label="Outstanding Bills" value={compactMoney(s.totalOutstanding, currency)} icon="pending" tone={s.totalOutstanding ? "negative" : "positive"} />
        <Kpi label="Active" value={String(s.ranking.filter((r) => r.orders > 0).length)} icon="check_circle" tone="positive" sub="with orders" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Supplier Ranking</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">#</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Supplier</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Orders</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Received</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Outstanding</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Purchase Value</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {s.ranking.length === 0 ? (
                <tr><td colSpan={6} className="p-lg text-center text-on-surface-variant">No suppliers yet.</td></tr>
              ) : (
                s.ranking.map((r, i) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md text-on-surface-variant">{i + 1}</td>
                    <td className="p-md font-medium text-on-surface">{r.name}</td>
                    <td className="p-md text-right tabular-nums">{r.orders}</td>
                    <td className="p-md text-right tabular-nums text-primary">{r.received}</td>
                    <td className="p-md text-right tabular-nums text-error">{r.outstanding > 0 ? money(r.outstanding, currency) : "—"}</td>
                    <td className="p-md text-right font-semibold tabular-nums">{money(r.value, currency)}</td>
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
