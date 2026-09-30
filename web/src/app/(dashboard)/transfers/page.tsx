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
import { getBranches } from "@/lib/branches/data";
import { getTransferRequests, type TransferStatus } from "@/lib/transfers/data";
import { createTransfer } from "@/lib/transfers/actions";
import { TransferActions } from "./TransferActions";

export const metadata = { title: "Stock Transfers — Inventory Pro" };

const STATUS_STYLE: Record<TransferStatus, { label: string; cls: string; icon: string }> = {
  pending: { label: "Pending", cls: "bg-tertiary-container/40 text-tertiary", icon: "schedule" },
  completed: { label: "Completed", cls: "bg-primary-container/40 text-primary", icon: "check_circle" },
  cancelled: { label: "Cancelled", cls: "bg-surface-container-high text-on-surface-variant", icon: "cancel" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function TransfersPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const [transfers, movements, products, warehouses, branches] = org
    ? await Promise.all([
        getTransferRequests(org.orgId),
        getStockMovements(org.orgId, 200),
        getProductOptions(org.orgId),
        getWarehouseOptions(org.orgId),
        getBranches(org.orgId),
      ])
    : [[], [], [], [], []];

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const whName = new Map(warehouses.map((w) => [w.id, w.name]));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const historyMovements = movements.filter((m) => m.type === "transfer");

  const whLabel = (wid: string | null, bid: string | null) => {
    const w = wid ? whName.get(wid) ?? "—" : "—";
    const b = bid ? branchName.get(bid) : null;
    return b ? `${w} · ${b}` : w;
  };

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Stock Transfers</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Move inventory between warehouses and branches. Stock moves only when a transfer is completed.
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

      {/* Transfer requests */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col mb-lg">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Transfers</h3>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{transfers.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Transfer</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">From → To</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Qty</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No transfers yet. Create one to move stock between branches." : "Sign in to view transfers."}
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const s = STATUS_STYLE[t.status];
                  return (
                    <tr key={t.id} className="hover:bg-surface-container-high transition-colors align-top">
                      <td className="p-md whitespace-nowrap">
                        <div className="font-label-md text-label-md text-on-surface font-semibold">{t.transferNumber}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant text-xs">{fmt(t.createdAt)}</div>
                      </td>
                      <td className="p-md font-body-sm text-body-sm text-on-surface">{t.productId ? productName.get(t.productId) ?? "—" : "—"}</td>
                      <td className="p-md font-body-sm text-body-sm text-on-surface-variant">
                        <span className="text-on-surface">{whLabel(t.sourceWarehouseId, t.sourceBranchId)}</span>
                        <Icon name="arrow_forward" size={13} className="mx-1 align-middle" />
                        <span className="text-on-surface">{whLabel(t.destWarehouseId, t.destBranchId)}</span>
                      </td>
                      <td className="p-md text-right font-medium text-on-surface">{t.quantity}</td>
                      <td className="p-md">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.cls}`}>
                          <Icon name={s.icon} size={13} /> {s.label}
                        </span>
                      </td>
                      <td className="p-md">
                        {t.status === "pending" ? (
                          <TransferActions id={t.id} />
                        ) : (
                          <span className="block text-right text-on-surface-variant text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement history */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Movement History</h3>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{historyMovements.length} movements</span>
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
              {historyMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    No completed transfers yet.
                  </td>
                </tr>
              ) : (
                historyMovements.map((m) => (
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
      submitLabel="Create transfer"
      action={createTransfer}
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
      <div>
        <label className={labelCls}>Notes</label>
        <input name="notes" className={fieldCls} placeholder="Optional reason / reference" />
      </div>
    </CrudDialog>
  );
}
