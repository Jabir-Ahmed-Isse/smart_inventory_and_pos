import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine, Donut } from "@/components/finance/Charts";
import { RankBars } from "@/components/analytics/RankBars";
import { ReceiveStockDialog } from "./ReceiveStockDialog";
import { getActiveOrg } from "@/lib/org";
import { getProductOptions, getWarehouseOptions, getSupplierOptions, money, compactMoney } from "@/lib/data";
import { getPurchasingOverview, STATUS_META } from "@/lib/purchasing/data";

export const metadata = { title: "Purchasing Overview — Inventory Pro" };

export default async function PurchasingOverviewPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view purchasing.</div>;

  const [o, products, warehouses, suppliers] = await Promise.all([
    getPurchasingOverview(org.orgId),
    getProductOptions(org.orgId),
    getWarehouseOptions(org.orgId),
    getSupplierOptions(org.orgId),
  ]);
  const k = o.kpis;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      {/* Header + actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Purchasing</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Procurement command centre — orders, receiving, suppliers and spend.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <Link href="/rfq" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
            <Icon name="add" size={16} /> Create PO / RFQ
          </Link>
          <ReceiveStockDialog products={products} warehouses={warehouses} suppliers={suppliers} />
          <Link href="/purchases/orders" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="upload_file" size={16} /> Import
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Purchase Orders" value={String(k.totalOrders)} icon="receipt_long" tone="neutral" />
        <Kpi label="Pending Orders" value={String(k.pending)} icon="pending" tone={k.pending ? "warning" : "positive"} />
        <Kpi label="Approved / Ordered" value={String(k.approved)} icon="verified" tone="positive" />
        <Kpi label="Goods Received Today" value={String(k.receivedToday)} icon="inventory" tone="positive" sub="units" />
        <Kpi label="Active Suppliers" value={String(k.activeSuppliers)} icon="storefront" tone="neutral" />
        <Kpi label="Outstanding Bills" value={compactMoney(k.outstandingValue, currency)} icon="account_balance_wallet" tone={k.outstandingValue ? "negative" : "positive"} />
        <Kpi label="Total Purchase Value" value={compactMoney(k.totalValue, currency)} icon="payments" tone="neutral" />
        <Kpi label="Avg Order Value" value={compactMoney(k.avgOrderValue, currency)} icon="insights" tone="neutral" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Monthly Purchase Spend</h3>
          <div className="h-[280px]"><RevenueExpenseBars labels={o.spendByMonth.map((m) => m.label)} income={o.spendByMonth.map(() => 0)} expense={o.spendByMonth.map((m) => Math.round(m.value))} /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Order Status</h3>
          <div className="h-[180px] relative mb-md">
            <Donut labels={["Draft", "Ordered", "Partial", "Received"]} values={[o.statusCounts.draft, o.statusCounts.pending, o.statusCounts.partial, o.statusCounts.received]} colors={["#9aa8a0", "#e5a05a", "#1f6f8b", "#0b7a52"]} />
          </div>
          <div className="grid grid-cols-2 gap-2 font-label-md text-label-md">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#9aa8a0]" /> Draft {o.statusCounts.draft}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#e5a05a]" /> Ordered {o.statusCounts.pending}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1f6f8b]" /> Partial {o.statusCounts.partial}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0b7a52]" /> Received {o.statusCounts.received}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Purchase Trend (12 months)</h3>
          <div className="h-[240px]"><TrendLine labels={o.spendByMonth.map((m) => m.label)} values={o.spendByMonth.map((m) => Math.round(m.value))} label="Spend" color="#1f6f8b" /></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Supplier Performance</h3>
          <RankBars rows={o.supplierRanking.slice(0, 6).map((r) => ({ label: r.name, value: r.value, display: money(r.value, currency) }))} emptyText="No supplier spend yet." />
        </div>
      </div>

      {/* Recent POs + receiving + AI */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* Recent POs */}
        <div className="xl:col-span-2 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Purchase Orders</h3>
            <Link href="/purchases/orders" className="text-primary font-label-md text-label-md hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">PO #</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Supplier</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Buyer</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                {o.recentPOs.length === 0 ? (
                  <tr><td colSpan={6} className="p-lg text-center text-on-surface-variant">No purchase orders yet.</td></tr>
                ) : (
                  o.recentPOs.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-md"><Link href={`/purchases/orders/${p.id}`} className="font-mono text-xs text-primary hover:underline">{p.poNumber}</Link></td>
                      <td className="p-md text-on-surface">{p.supplier}</td>
                      <td className="p-md text-on-surface-variant">{p.warehouse}</td>
                      <td className="p-md text-on-surface-variant">{p.buyer}</td>
                      <td className="p-md"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_META[p.status]?.cls ?? ""}`}>{STATUS_META[p.status]?.label ?? p.status}</span></td>
                      <td className="p-md text-right font-semibold tabular-nums">{money(p.total, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI insights */}
        <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/10 border border-primary/20 rounded-xl p-md shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-md">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="auto_awesome" filled /></div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">AI Purchasing Insights</h3>
          </div>
          <ul className="space-y-3 flex-1 font-body-sm text-body-sm text-on-surface">
            {o.supplierRanking[0] && <AiLine icon="workspace_premium">{o.supplierRanking[0].name} is your top supplier by spend ({money(o.supplierRanking[0].value, currency)}).</AiLine>}
            {k.outstandingValue > 0 && <AiLine icon="schedule">{compactMoney(k.outstandingValue, currency)} in supplier bills is outstanding across {k.pending} open order(s).</AiLine>}
            {k.pending > 0 && <AiLine icon="pending_actions">{k.pending} order(s) pending — approve or receive to keep stock flowing.</AiLine>}
            <AiLine icon="savings">Consolidating orders with your top supplier could unlock volume discounts.</AiLine>
          </ul>
        </div>
      </div>

      {/* Receiving activities */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-lg">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Receiving Activity</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Qty</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Received By</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {o.receivingActivities.length === 0 ? (
                <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">No receiving activity yet.</td></tr>
              ) : (
                o.receivingActivities.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md text-on-surface font-medium">{a.product}</td>
                    <td className="p-md text-on-surface-variant">{a.warehouse}</td>
                    <td className="p-md text-right tabular-nums text-primary">+{a.qty}</td>
                    <td className="p-md text-on-surface-variant">{a.by}</td>
                    <td className="p-md text-on-surface-variant whitespace-nowrap">{a.date}</td>
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

function AiLine({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={icon} size={18} className="text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
