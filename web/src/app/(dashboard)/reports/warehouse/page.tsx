import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RankBars } from "@/components/analytics/RankBars";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getWarehouseAnalytics } from "@/lib/reports/data";

export const metadata = { title: "Warehouse Reports — Reports" };

export default async function WarehouseReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view warehouse reports.</div>;
  const w = await getWarehouseAnalytics(org.orgId);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Warehouse Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Stock distribution and movement activity across facilities.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-md mb-lg">
        <Kpi label="Warehouses" value={String(w.warehouses.length)} icon="warehouse" tone="neutral" />
        <Kpi label="Total Units" value={w.totalUnits.toLocaleString()} icon="inventory_2" tone="neutral" />
        <Kpi label="Stock Value" value={compactMoney(w.totalValue, currency)} icon="savings" tone="positive" />
        <Kpi label="Receiving" value={String(w.receiving)} icon="login" tone="positive" sub="movements" />
        <Kpi label="Dispatch" value={String(w.dispatch)} icon="logout" tone="warning" sub="movements" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Stock Value by Warehouse</h3>
          <RankBars rows={[...w.warehouses].sort((a, b) => b.value - a.value).map((x) => ({ label: x.name, value: x.value, display: money(x.value, currency), sub: `${x.units} units${x.isPrimary ? " · primary" : ""}` }))} emptyText="No warehouses yet." />
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Movement Activity</h3>
          <div className="space-y-md">
            <MoveStat icon="login" label="Receiving" value={w.receiving} tone="text-primary" />
            <MoveStat icon="logout" label="Dispatch (sales)" value={w.dispatch} tone="text-tertiary" />
            <MoveStat icon="swap_horiz" label="Transfers" value={w.transfers} tone="text-secondary" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Warehouse Performance</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Location</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Units</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Value</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">In / Out</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {w.warehouses.length === 0 ? (
                <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">No warehouses yet.</td></tr>
              ) : (
                w.warehouses.map((x) => (
                  <tr key={x.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md font-medium text-on-surface">{x.name}{x.isPrimary && <span className="ml-2 text-[10px] uppercase text-primary">Primary</span>}</td>
                    <td className="p-md text-on-surface-variant">{x.location ?? "—"}</td>
                    <td className="p-md text-right tabular-nums">{x.units.toLocaleString()}</td>
                    <td className="p-md text-right font-semibold tabular-nums">{money(x.value, currency)}</td>
                    <td className="p-md text-right tabular-nums text-on-surface-variant">{x.receiving} / {x.dispatch}</td>
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

function MoveStat({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50">
      <div className={`w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center ${tone}`}><Icon name={icon} /></div>
      <span className="font-body-sm text-body-sm text-on-surface flex-1">{label}</span>
      <span className="font-headline-lg text-headline-lg text-on-surface tabular-nums">{value}</span>
    </div>
  );
}
