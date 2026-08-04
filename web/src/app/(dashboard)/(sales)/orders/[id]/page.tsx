import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getActiveAccounts } from "@/lib/accounts/data";
import { getSalesOrderDetail, money } from "@/lib/data";
import { MarkPaidButton } from "../MarkPaidButton";

export const metadata = { title: "Order — Inventory Pro" };

const PAY_LABEL: Record<string, string> = { cash: "Cash", card: "Card", mobile: "Mobile", credit: "Credit", bank: "Bank" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["owner", "admin", "manager", "accountant", "cashier"]);
  const { id } = await params;
  const org = await getActiveOrg();
  if (!org) return null;

  const [order, accounts] = await Promise.all([getSalesOrderDetail(org.orgId, id), getActiveAccounts(org.orgId)]);
  if (!order) notFound();
  const currency = org.currency ?? "USD";

  const statusPill = order.paid
    ? { label: "Paid", cls: "bg-primary-container/20 text-primary border border-primary/20" }
    : order.partiallyPaid
      ? { label: "Partial", cls: "bg-secondary-container/30 text-secondary border border-secondary-container/40" }
      : order.status === "refunded"
        ? { label: "Refunded", cls: "bg-secondary-container/20 text-secondary border border-secondary-container/30" }
        : order.status === "cancelled"
          ? { label: "Cancelled", cls: "bg-error-container/20 text-error border border-error-container/30" }
          : { label: "Due", cls: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30" };

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="max-w-[1000px] mx-auto space-y-lg">
        {/* Header */}
        <div>
          <Link href="/orders" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface mb-sm transition-colors">
            <Icon name="arrow_back" size={16} /> Back to Orders
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div className="flex items-center gap-md">
              <h1 className="font-headline-xl text-headline-xl text-on-surface font-mono">{order.orderNumber}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusPill.cls}`}>{statusPill.label}</span>
            </div>
            {order.isDue && (
              <MarkPaidButton
                orderId={order.id}
                orderNumber={order.orderNumber}
                total={order.total}
                due={order.dueAmount}
                currency={currency}
                accounts={accounts}
              />
            )}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            {order.date} at {order.time}
            {order.paymentMethod ? ` · ${PAY_LABEL[order.paymentMethod] ?? order.paymentMethod}` : ""}
            {order.warehouseName ? ` · ${order.warehouseName}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Left: items + payments */}
          <div className="lg:col-span-2 space-y-lg">
            {/* Items */}
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">Items ({order.items.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                      <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Qty</th>
                      <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Price</th>
                      <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 font-body-sm text-body-sm">
                    {order.items.length === 0 ? (
                      <tr><td colSpan={4} className="p-lg text-center text-on-surface-variant">No line items.</td></tr>
                    ) : (
                      order.items.map((it, i) => (
                        <tr key={i} className="hover:bg-surface-container-low transition-colors">
                          <td className="p-md">
                            <div className="text-on-surface font-medium">{it.name}</div>
                            {it.sku && <div className="text-xs text-on-surface-variant">SKU: {it.sku}</div>}
                          </td>
                          <td className="p-md text-right text-on-surface-variant">{it.quantity}</td>
                          <td className="p-md text-right text-on-surface-variant">{money(it.unitPrice, currency)}</td>
                          <td className="p-md text-right font-semibold text-on-surface">{money(it.lineTotal, currency)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">Payment history</h3>
              </div>
              {order.payments.length === 0 ? (
                <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                  No payments recorded yet — this order is unpaid.
                </p>
              ) : (
                <div className="divide-y divide-outline-variant/60">
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-sm p-md">
                      <div className="flex items-center gap-sm min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon name="paid" size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-body-sm text-body-sm text-on-surface truncate">{p.accountName ?? "Payment"}</p>
                          <p className="font-label-md text-label-md text-on-surface-variant">{p.date} · {p.time}</p>
                        </div>
                      </div>
                      <span className="font-body-sm text-body-sm font-semibold text-primary tabular-nums whitespace-nowrap">
                        +{money(p.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: customer + summary */}
          <div className="space-y-lg">
            {/* Customer */}
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-md">
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Customer</h3>
              {order.customer ? (
                <div className="flex items-center gap-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                    {order.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-on-surface font-medium truncate">{order.customer.name}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant truncate">
                      {order.customer.phone ?? order.customer.email ?? "No contact"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="person_outline" size={18} /> Walk-in customer
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-md space-y-sm">
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-xs">Summary</h3>
              <Row label="Subtotal" value={money(order.subtotal, currency)} />
              {order.discount > 0 && <Row label="Discount" value={`− ${money(order.discount, currency)}`} />}
              <Row label="Tax" value={money(order.tax, currency)} />
              <div className="border-t border-outline-variant pt-sm flex justify-between font-headline-lg text-headline-lg text-on-surface">
                <span>Total</span>
                <span className="text-primary tabular-nums">{money(order.total, currency)}</span>
              </div>
              <div className="border-t border-outline-variant pt-sm space-y-xs">
                <Row label="Paid" value={money(order.paidAmount, currency)} valueCls="text-primary" />
                <Row label="Balance due" value={money(order.dueAmount, currency)} valueCls={order.dueAmount > 0 ? "text-tertiary font-semibold" : "text-on-surface-variant"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex justify-between font-body-sm text-body-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className={`tabular-nums ${valueCls ?? "text-on-surface"}`}>{value}</span>
    </div>
  );
}
