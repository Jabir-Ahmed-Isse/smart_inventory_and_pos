import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import {
  getStockMovements,
  getProductOptions,
  getWarehouseOptions,
  getSupplierOptions,
  type Option,
  type WarehouseOption,
} from "@/lib/data";
import { returnToSupplier } from "@/lib/workflows/actions";

export const metadata = { title: "Purchase Returns — Inventory Pro" };

export default async function PurchaseReturnsPage() {
  const org = await getActiveOrg();
  const [movements, products, warehouses, suppliers] = org
    ? await Promise.all([
        getStockMovements(org.orgId, 300),
        getProductOptions(org.orgId),
        getWarehouseOptions(org.orgId),
        getSupplierOptions(org.orgId),
      ])
    : [[], [], [], []];

  // Supplier returns are outbound adjustments tagged with a PRET- reference.
  const returns = movements.filter((m) => (m.reference ?? "").startsWith("PRET-"));
  const totalUnits = returns.reduce((s, m) => s + Math.abs(m.quantity), 0);

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Purchase Returns</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Send defective or excess stock back to suppliers — inventory is decremented and traced.
          </p>
        </div>
        <NewSupplierReturnDialog products={products} warehouses={warehouses} suppliers={suppliers} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-lg">
        <Kpi label="Return Events" value={returns.length.toLocaleString()} icon="keyboard_return" tone="neutral" />
        <Kpi label="Units Returned" value={totalUnits.toLocaleString()} icon="undo" tone="warning" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Return History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Reason / Ref</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Returned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No supplier returns recorded yet." : "Sign in to record returns."}
                  </td>
                </tr>
              ) : (
                returns.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md whitespace-nowrap text-on-surface-variant">
                      <div className="font-medium text-body-sm">{m.date}</div>
                      <div className="text-xs">{m.time}</div>
                    </td>
                    <td className="p-md">
                      <div className="font-label-md text-label-md text-on-surface font-semibold">{m.productName}</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">{m.sku}</div>
                    </td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{m.warehouseName}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant text-xs">{m.reference ?? "—"}</td>
                    <td className="p-md text-right font-medium text-error">−{Math.abs(m.quantity)}</td>
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

function NewSupplierReturnDialog({ products, warehouses, suppliers }: { products: (Option & { sku: string })[]; warehouses: WarehouseOption[]; suppliers: Option[] }) {
  return (
    <CrudDialog
      triggerLabel="Return to Supplier"
      triggerIcon="undo"
      title="Return Goods to Supplier"
      submitLabel="Record Return"
      action={returnToSupplier}
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
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Warehouse *</label>
          <select name="warehouse_id" required className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="" disabled>Pull stock from…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Quantity *</label>
          <input name="quantity" required type="number" min="1" className={fieldCls} placeholder="Units" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Supplier</label>
          <select name="supplier" className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="">Unassigned</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Reason</label>
          <input name="reason" type="text" className={fieldCls} placeholder="Defective / over-supply" />
        </div>
      </div>
    </CrudDialog>
  );
}
