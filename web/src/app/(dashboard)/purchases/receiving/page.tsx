import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { ReceiveStockDialog } from "../ReceiveStockDialog";
import { getActiveOrg } from "@/lib/org";
import { getProductOptions, getWarehouseOptions, getSupplierOptions, money } from "@/lib/data";
import { getPurchasingOverview, STATUS_META } from "@/lib/purchasing/data";

export const metadata = { title: "Goods Receiving — Inventory Pro" };

export default async function ReceivingPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to receive goods.</div>;

  const [o, products, warehouses, suppliers] = await Promise.all([
    getPurchasingOverview(org.orgId),
    getProductOptions(org.orgId),
    getWarehouseOptions(org.orgId),
    getSupplierOptions(org.orgId),
  ]);
  const openPOs = o.pos.filter((p) => ["draft", "pending", "overdue", "partial"].includes(p.status));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Goods Receiving</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Receive stock against purchase orders — inventory updates automatically.</p>
        </div>
        <ReceiveStockDialog products={products} warehouses={warehouses} suppliers={suppliers} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Received Today" value={String(o.kpis.receivedToday)} icon="inventory" tone="positive" sub="units" />
        <Kpi label="Open POs" value={String(openPOs.length)} icon="pending" tone={openPOs.length ? "warning" : "positive"} />
        <Kpi label="Awaiting Value" value={money(openPOs.reduce((s, p) => s + p.total, 0), currency)} icon="account_balance_wallet" tone="neutral" />
        <Kpi label="Receiving Events" value={String(o.receivingActivities.length)} icon="local_shipping" tone="neutral" sub="recent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Open POs to receive */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Awaiting Receipt</h3></div>
          {openPOs.length === 0 ? (
            <div className="p-xl text-center text-on-surface-variant"><Icon name="check_circle" size={28} className="text-primary mx-auto mb-2" />Nothing awaiting receipt — all caught up.</div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {openPOs.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-md hover:bg-surface-container-low transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-tertiary-container/20 text-tertiary flex items-center justify-center shrink-0"><Icon name="local_shipping" /></div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/purchases/orders/${p.id}`} className="font-mono text-xs text-primary hover:underline">{p.poNumber}</Link>
                    <p className="font-body-sm text-body-sm text-on-surface truncate">{p.supplier} → {p.warehouse}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${STATUS_META[p.status]?.cls ?? ""}`}>{STATUS_META[p.status]?.label ?? p.status}</span>
                  <span className="font-body-sm text-body-sm font-semibold tabular-nums shrink-0">{money(p.total, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent receiving */}
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Receipts</h3></div>
          <div className="divide-y divide-outline-variant/60">
            {o.receivingActivities.length === 0 ? (
              <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No receipts yet.</p>
            ) : (
              o.receivingActivities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center shrink-0"><Icon name="login" size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-sm text-body-sm text-on-surface truncate">{a.product}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">{a.warehouse} · {a.date}</p>
                  </div>
                  <span className="font-body-sm text-body-sm font-semibold text-primary shrink-0">+{a.qty}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advanced receiving note */}
      <div className="mt-lg rounded-xl border border-tertiary-container/40 bg-tertiary-container/10 px-md py-sm flex items-start gap-3">
        <Icon name="info" className="text-tertiary shrink-0 mt-0.5" />
        <p className="font-body-sm text-body-sm text-on-surface">
          <b>Batch numbers, expiry dates and quality inspection</b> are part of the ERP receiving flow but need extra fields on inventory and a QC step. Receiving via the dialog updates stock, logs a movement and posts the cost automatically today.
        </p>
      </div>
    </main>
  );
}
