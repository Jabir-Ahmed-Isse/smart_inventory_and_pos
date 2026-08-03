import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import {
  getStockMovements,
  getProductOptions,
  getWarehouseOptions,
  type Option,
  type WarehouseOption,
} from "@/lib/data";
import { transferStock } from "@/lib/workflows/actions";

export const metadata = { title: "Stock Transfers — Inventory Pro" };

export default async function TransfersPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const [movements, products, warehouses] = org
    ? await Promise.all([
        getStockMovements(org.orgId, 200),
        getProductOptions(org.orgId),
        getWarehouseOptions(org.orgId),
      ])
    : [[], [], []];

  const transfers = movements.filter((m) => m.type === "transfer");

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Stock Transfers</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Move inventory between warehouses and track the movement history.
          </p>
        </div>
        <NewTransferDialog products={products} warehouses={warehouses} />
      </div>

      {warehouses.length < 2 && org && (
        <div className="mb-lg rounded-xl border border-tertiary-container/40 bg-tertiary-container/10 px-md py-sm font-body-sm text-body-sm text-on-surface flex items-center gap-2">
          <Icon name="info" size={18} className="text-tertiary" />
          You need at least two warehouses to transfer stock. Add another under Warehouses.
        </div>
      )}

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Transfer History</h3>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{transfers.length} movements</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Reference</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No transfers yet. Create one to move stock between warehouses." : "Sign in to view transfers."}
                  </td>
                </tr>
              ) : (
                transfers.map((m) => (
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
                    <td className={`p-md text-right font-medium ${m.quantity >= 0 ? "text-primary" : "text-tertiary"}`}>
                      {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
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

function NewTransferDialog({ products, warehouses }: { products: (Option & { sku: string })[]; warehouses: WarehouseOption[] }) {
  return (
    <CrudDialog
      triggerLabel="New Transfer"
      triggerIcon="swap_horiz"
      title="Transfer Stock"
      submitLabel="Transfer"
      action={transferStock}
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
          <label className={labelCls}>From *</label>
          <select name="from_warehouse_id" required className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="" disabled>Source…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>To *</label>
          <select name="to_warehouse_id" required className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="" disabled>Destination…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Quantity *</label>
        <input name="quantity" required type="number" min="1" className={fieldCls} placeholder="Units to move" />
      </div>
    </CrudDialog>
  );
}
