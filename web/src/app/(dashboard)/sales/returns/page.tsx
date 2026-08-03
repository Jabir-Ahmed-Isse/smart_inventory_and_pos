import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import {
  getStockMovements,
  getProductOptions,
  getWarehouseOptions,
  money,
  type Option,
  type WarehouseOption,
} from "@/lib/data";
import { recordReturn } from "@/lib/workflows/actions";

export const metadata = { title: "Sales Returns — Inventory Pro" };

export default async function SalesReturnsPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const [movements, products, warehouses] = org
    ? await Promise.all([
        getStockMovements(org.orgId, 200),
        getProductOptions(org.orgId),
        getWarehouseOptions(org.orgId),
      ])
    : [[], [], []];

  // Customer returns restock inventory — recorded as positive "return" movements.
  const returns = movements.filter((m) => m.type === "return" && m.quantity > 0);
  const totalUnits = returns.reduce((s, m) => s + Math.abs(m.quantity), 0);

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Sales Returns &amp; Refunds</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Restock items returned by customers and record refunds against finance.
          </p>
        </div>
        <NewReturnDialog products={products} warehouses={warehouses} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-lg">
        <Kpi label="Return Events" value={returns.length.toLocaleString()} icon="keyboard_return" tone="neutral" />
        <Kpi label="Units Restocked" value={totalUnits.toLocaleString()} icon="inventory_2" tone="positive" />
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
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Restocked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No customer returns recorded yet." : "Sign in to record returns."}
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
                    <td className="p-md text-right font-medium text-primary">+{Math.abs(m.quantity)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-md font-label-md text-label-md text-on-surface-variant">Amounts shown in {currency}.</p>
    </main>
  );
}

function NewReturnDialog({ products, warehouses }: { products: (Option & { sku: string })[]; warehouses: WarehouseOption[] }) {
  return (
    <CrudDialog
      triggerLabel="Record Return"
      triggerIcon="keyboard_return"
      title="Record a Customer Return"
      submitLabel="Record Return"
      action={recordReturn}
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
            <option value="" disabled>Restock to…</option>
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
          <label className={labelCls}>Refund Amount</label>
          <input name="refund" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Reason</label>
          <input name="reason" type="text" className={fieldCls} placeholder="Damaged / wrong item" />
        </div>
      </div>
    </CrudDialog>
  );
}
