import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import {
  getInventoryLevels,
  getProductOptions,
  getWarehouseOptions,
  type Option,
  type WarehouseOption,
} from "@/lib/data";
import { recordStocktake } from "@/lib/workflows/actions";

export const metadata = { title: "Audit & Stocktake — Inventory Pro" };

export default async function StocktakePage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const [levels, products, warehouses] = org
    ? await Promise.all([
        getInventoryLevels(org.orgId),
        getProductOptions(org.orgId),
        getWarehouseOptions(org.orgId),
      ])
    : [[], [], []];

  const totalUnits = levels.reduce((s, l) => s + l.quantity, 0);
  const zeroCount = levels.filter((l) => l.quantity <= 0).length;

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Audit &amp; Stocktake</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Record physical counts and reconcile inventory discrepancies.
          </p>
        </div>
        <RecordCountDialog products={products} warehouses={warehouses} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-lg">
        <Kpi label="Stock Records" value={levels.length.toLocaleString()} icon="inventory_2" tone="neutral" />
        <Kpi label="Total Units On Hand" value={totalUnits.toLocaleString()} icon="functions" tone="neutral" />
        <Kpi label="Out of Stock Records" value={zeroCount.toLocaleString()} icon="production_quantity_limits" tone={zeroCount > 0 ? "negative" : "positive"} />
      </div>

      {/* Levels table */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Current Stock Levels</h3>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Lowest first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Item SKU &amp; Name</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">System Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {levels.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No stock records yet. Add products with stock to begin." : "Sign in to run a stocktake."}
                  </td>
                </tr>
              ) : (
                levels.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md">
                      <p className="font-label-md text-label-md text-on-surface font-semibold">{l.productName}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">SKU: {l.sku}</p>
                    </td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{l.warehouseName}</td>
                    <td className="p-md text-right font-body-sm text-body-sm font-semibold">
                      <span className={l.quantity <= 0 ? "text-error" : "text-on-surface"}>{l.quantity.toLocaleString()}</span>
                    </td>
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

function RecordCountDialog({ products, warehouses }: { products: (Option & { sku: string })[]; warehouses: WarehouseOption[] }) {
  return (
    <CrudDialog
      triggerLabel="Record Count"
      triggerIcon="fact_check"
      title="Record Physical Count"
      submitLabel="Save Count"
      action={recordStocktake}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <div>
        <label className={labelCls}>Product *</label>
        <select name="product_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Warehouse *</label>
        <select name="warehouse_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select a warehouse…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Counted Quantity *</label>
        <input name="counted" required type="number" min="0" className={fieldCls} placeholder="Physical count" />
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs text-[13px]">
          We&apos;ll record an adjustment for the difference vs. the system quantity.
        </p>
      </div>
    </CrudDialog>
  );
}

