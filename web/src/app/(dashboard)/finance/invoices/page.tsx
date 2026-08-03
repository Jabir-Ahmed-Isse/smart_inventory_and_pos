import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance } from "@/lib/finance/data";

export const metadata = { title: "Invoices — Inventory Pro" };

type InvStatus = "paid" | "pending" | "overdue";
const PILL: Record<InvStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-primary-container/20 text-primary border border-primary/20" },
  pending: { label: "Pending", cls: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30" },
  overdue: { label: "Overdue", cls: "bg-error-container/30 text-error border border-error-container/40" },
};

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function InvoicesPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;

  const sales = (raw?.salesOrders ?? [])
    .filter((o) => o.status !== "cancelled")
    .map((o) => ({
      ref: o.orderNumber,
      party: o.customerName,
      date: o.createdAt,
      total: o.total,
      status: (o.paid ? "paid" : daysAgo(o.createdAt) > 30 ? "overdue" : "pending") as InvStatus,
    }));
  const purchases = (raw?.purchaseOrders ?? [])
    .filter((p) => p.status !== "cancelled")
    .map((p) => ({
      ref: p.poNumber,
      party: p.supplierName,
      date: p.createdAt,
      total: p.total,
      status: (p.status === "received" ? "paid" : daysAgo(p.createdAt) > 30 ? "overdue" : "pending") as InvStatus,
    }));

  const all = [...sales, ...purchases];
  const sum = (s: InvStatus) => all.filter((i) => i.status === s).reduce((a, i) => a + i.total, 0);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Invoices</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Sales and purchase invoices with payment status.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Invoiced" value={compactMoney(all.reduce((a, i) => a + i.total, 0), currency)} icon="description" tone="neutral" sub={`${all.length} invoices`} />
        <Kpi label="Paid" value={compactMoney(sum("paid"), currency)} icon="check_circle" tone="positive" />
        <Kpi label="Pending" value={compactMoney(sum("pending"), currency)} icon="schedule" tone="warning" />
        <Kpi label="Overdue" value={compactMoney(sum("overdue"), currency)} icon="warning" tone="negative" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
        <InvoiceTable title="Sales Invoices" party="Customer" rows={sales} currency={currency} icon="point_of_sale" />
        <InvoiceTable title="Purchase Invoices" party="Supplier" rows={purchases} currency={currency} icon="local_shipping" />
      </div>
    </main>
  );
}

function InvoiceTable({
  title,
  party,
  rows,
  currency,
  icon,
}: {
  title: string;
  party: string;
  rows: { ref: string; party: string; date: string; total: number; status: InvStatus }[];
  currency: string;
  icon: string;
}) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <div className="p-md border-b border-outline-variant flex items-center gap-2 bg-surface-container-lowest">
        <Icon name={icon} className="text-primary" size={20} />
        <h3 className="font-headline-lg text-headline-lg text-on-surface">{title}</h3>
        <span className="ml-auto font-label-md text-label-md text-on-surface-variant">{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Invoice</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">{party}</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">No invoices yet.</td></tr>
            ) : (
              rows.slice(0, 12).map((r) => (
                <tr key={r.ref} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-md font-mono text-xs text-on-surface">{r.ref}</td>
                  <td className="p-md text-on-surface-variant">{r.party}</td>
                  <td className="p-md text-on-surface-variant whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="p-md"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${PILL[r.status].cls}`}>{PILL[r.status].label}</span></td>
                  <td className="p-md text-right font-semibold text-on-surface">{money(r.total, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
