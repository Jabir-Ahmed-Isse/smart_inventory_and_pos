import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { NewAssetDialog } from "@/components/assets/AssetDialogs";
import { RunDepreciationForm, DisposeButton, SeedAssetsButton } from "@/components/assets/AssetActions";
import { requireRole } from "@/lib/rbac";
import { money, compactMoney } from "@/lib/data";
import { loadAssets, assetsOverview } from "@/lib/assets/data";

export const metadata = { title: "Fixed Assets — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  active: "bg-primary-container/20 text-primary",
  fully_depreciated: "bg-tertiary-container/20 text-tertiary",
  disposed: "bg-surface-container-high text-on-surface-variant line-through",
};

export default async function FixedAssetsPage() {
  const org = await requireRole(["owner", "admin", "accountant"]);
  const assets = await loadAssets(org.orgId);
  const o = assetsOverview(assets);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Fixed Assets</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Asset register with straight-line depreciation posted to your ledger.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <SeedAssetsButton />
          <NewAssetDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Assets" value={String(o.count)} icon="inventory" tone="neutral" />
        <Kpi label="Total Cost" value={compactMoney(o.totalCost, currency)} icon="paid" tone="neutral" />
        <Kpi label="Net Book Value" value={compactMoney(o.netBookValue, currency)} icon="account_balance" tone="positive" sub={`${compactMoney(o.totalDepreciation, currency)} depreciated`} />
        <Kpi label="Monthly Depreciation" value={compactMoney(o.monthlyDepreciation, currency)} icon="trending_down" tone="warning" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md px-md py-3 border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Asset Register</h3>
          <RunDepreciationForm />
        </div>
        {assets.length === 0 ? (
          <div className="p-xl text-center">
            <Icon name="inventory" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
            <p className="font-body-md text-body-md text-on-surface-variant">No fixed assets yet.</p>
            <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Add equipment, vehicles or property to track depreciation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant/60">
                  <th className="px-md py-2 font-medium">Asset</th>
                  <th className="px-md py-2 font-medium">Category</th>
                  <th className="px-md py-2 font-medium text-right">Cost</th>
                  <th className="px-md py-2 font-medium text-right">Depreciated</th>
                  <th className="px-md py-2 font-medium text-right">Book Value</th>
                  <th className="px-md py-2 font-medium text-right">Per Month</th>
                  <th className="px-md py-2 font-medium">Status</th>
                  <th className="px-md py-2 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3">
                      <p className="font-body-sm text-body-sm text-on-surface">{a.name}</p>
                      <p className="font-label-md text-label-md text-on-surface-variant">{a.assetNumber} · {new Date(a.acquisitionDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{a.category ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(a.cost, currency)}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface-variant">{money(a.accumulatedDepreciation, currency)}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums font-medium text-on-surface">{money(a.bookValue, currency)}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface-variant">{a.status === "active" ? money(a.monthlyDepreciation, currency) : "—"}</td>
                    <td className="px-md py-3"><span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[a.status]}`}>{a.status.replace("_", " ")}</span></td>
                    <td className="px-md py-3 text-right">{a.status !== "disposed" && <DisposeButton id={a.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
