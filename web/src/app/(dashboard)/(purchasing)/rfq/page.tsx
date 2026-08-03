import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import {
  getPurchaseOrders,
  getProductOptions,
  getSupplierOptions,
  money,
  type Option,
  type PurchaseStatus,
} from "@/lib/data";
import { createRfq } from "@/lib/workflows/actions";

export const metadata = { title: "Requests for Quote — Inventory Pro" };

const STATUS_PILL: Record<PurchaseStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  pending: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
  received: "bg-primary-container/20 text-primary border border-primary/20",
  partial: "bg-secondary-container/20 text-secondary border border-secondary-container/30",
  overdue: "bg-error-container/20 text-error border border-error-container/30",
  cancelled: "bg-surface-variant text-on-surface-variant border border-outline-variant",
};

export default async function RfqPage() {
  const org = await getActiveOrg();
  const [orders, products, suppliers] = org
    ? await Promise.all([
        getPurchaseOrders(org.orgId),
        getProductOptions(org.orgId),
        getSupplierOptions(org.orgId),
      ])
    : [[], [], []];
  const currency = org?.currency ?? "USD";

  const drafts = orders.filter((o) => o.status === "draft").length;

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Requests for Quote</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Draft purchase orders and send them to suppliers for pricing.
          </p>
        </div>
        <NewRfqDialog products={products} suppliers={suppliers} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-lg">
        <Kpi label="Open RFQs / POs" value={orders.length.toLocaleString()} icon="request_quote" tone="neutral" />
        <Kpi label="Drafts" value={drafts.toLocaleString()} icon="edit_note" tone="neutral" />
        <Kpi label="Suppliers" value={suppliers.length.toLocaleString()} icon="local_shipping" tone="neutral" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Purchase Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">PO / RFQ #</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Supplier</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Est. Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No requests yet. Create your first RFQ." : "Sign in to manage RFQs."}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md font-mono text-body-sm text-on-surface">{o.poNumber}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{o.supplierName}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{o.date}</td>
                    <td className="p-md">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_PILL[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-md text-right font-body-sm text-body-sm font-semibold text-on-surface">{money(o.total, currency)}</td>
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

function NewRfqDialog({ products, suppliers }: { products: (Option & { sku: string })[]; suppliers: Option[] }) {
  return (
    <CrudDialog
      triggerLabel="New RFQ"
      triggerIcon="request_quote"
      title="New Request for Quote"
      submitLabel="Create RFQ"
      action={createRfq}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <div>
        <label className={labelCls}>Supplier</label>
        <select name="supplier_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">— Unassigned —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
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
          <label className={labelCls}>Quantity *</label>
          <input name="quantity" required type="number" min="1" className={fieldCls} placeholder="Units" />
        </div>
        <div>
          <label className={labelCls}>Est. Unit Cost</label>
          <input name="unit_cost" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
      </div>
    </CrudDialog>
  );
}

