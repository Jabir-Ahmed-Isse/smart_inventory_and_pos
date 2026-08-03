import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getSalesOrders, money, type SalesOrderRow, type SalesPayment } from "@/lib/data";
import { MarkPaidButton } from "./MarkPaidButton";

export const metadata = { title: "Sales Orders — Inventory Pro" };

const PILL = {
  paid: "bg-primary-container/20 text-primary border border-primary/20",
  due: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
  refunded: "bg-secondary-container/20 text-secondary border border-secondary-container/30",
  cancelled: "bg-error-container/20 text-error border border-error-container/30",
};

// Payment status is derived from whether the money was actually recorded.
function payState(o: SalesOrderRow): { label: string; cls: string } {
  if (o.status === "refunded") return { label: "Refunded", cls: PILL.refunded };
  if (o.status === "cancelled") return { label: "Cancelled", cls: PILL.cancelled };
  return o.paid ? { label: "Paid", cls: PILL.paid } : { label: "Due", cls: PILL.due };
}

const PAY_LABEL: Record<NonNullable<SalesPayment>, string> = {
  cash: "Cash",
  card: "Card",
  mobile: "Mobile",
  credit: "Credit",
};

export default async function OrdersPage() {
  await requireRole(["owner", "admin", "manager", "accountant"]);
  const org = await getActiveOrg();
  const orders = org ? await getSalesOrders(org.orgId) : [];
  const currency = org?.currency ?? "USD";

  const due = orders.filter((o) => o.isDue);
  const dueTotal = due.reduce((s, o) => s + o.total, 0);
  const paidTotal = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Sales Orders</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Every sale, with unpaid (due) orders you can settle here.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Orders" value={String(orders.length)} icon="receipt_long" tone="neutral" />
        <Kpi label="Due Orders" value={String(due.length)} icon="schedule" tone={due.length ? "warning" : "positive"} />
        <Kpi label="Amount Due" value={money(dueTotal, currency)} icon="account_balance_wallet" tone={dueTotal ? "warning" : "positive"} />
        <Kpi label="Collected" value={money(paidTotal, currency)} icon="paid" tone="positive" />
      </div>

      {/* Due first, if any */}
      {due.length > 0 && (
        <div className="mb-lg rounded-xl border border-tertiary-container/40 bg-tertiary-container/5 overflow-hidden">
          <div className="p-md border-b border-tertiary-container/30 flex items-center gap-sm">
            <Icon name="schedule" className="text-tertiary" />
            <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Awaiting Payment</h3>
          </div>
          <OrdersTable orders={due} currency={currency} showPay />
        </div>
      )}

      {/* All orders */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">All Orders</h3>
        </div>
        {orders.length === 0 ? (
          <p className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
            {org ? "No sales yet. Ring one up at the Point of Sale." : "Sign in to view orders."}
          </p>
        ) : (
          <OrdersTable orders={orders} currency={currency} />
        )}
      </div>
    </main>
  );

  function OrdersTable({
    orders,
    currency,
    showPay,
  }: {
    orders: Awaited<ReturnType<typeof getSalesOrders>>;
    currency: string;
    showPay?: boolean;
  }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Order</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Customer</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Payment</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Total</th>
              <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-md font-mono text-body-sm text-on-surface">{o.orderNumber}</td>
                <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{o.customerName}</td>
                <td className="p-md font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                  <div>{o.date}</div>
                  <div className="text-xs">{o.time}</div>
                </td>
                <td className="p-md font-body-sm text-body-sm text-on-surface-variant">
                  {o.paymentMethod ? PAY_LABEL[o.paymentMethod] : "—"}
                </td>
                <td className="p-md">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${payState(o).cls}`}>
                    {payState(o).label}
                  </span>
                </td>
                <td className="p-md text-right font-body-sm text-body-sm font-semibold text-on-surface">{money(o.total, currency)}</td>
                <td className="p-md text-right">
                  {o.isDue ? (
                    <MarkPaidButton orderId={o.id} orderNumber={o.orderNumber} />
                  ) : showPay ? null : (
                    <span className="text-on-surface-variant text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
