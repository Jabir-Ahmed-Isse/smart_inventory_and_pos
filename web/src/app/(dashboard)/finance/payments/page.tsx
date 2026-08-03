import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, paymentsByMethod } from "@/lib/finance/data";

export const metadata = { title: "Payments — Inventory Pro" };

const METHOD_META: Record<string, { label: string; icon: string; color: string }> = {
  cash: { label: "Cash", icon: "payments", color: "#0b7a52" },
  card: { label: "Card", icon: "credit_card", color: "#1f6f8b" },
  mobile: { label: "Mobile Money", icon: "smartphone", color: "#e5a05a" },
  credit: { label: "Credit / Due", icon: "schedule", color: "#8a5cf6" },
};

export default async function PaymentsPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const p = raw ? paymentsByMethod(raw) : null;

  if (!p) return <div className="p-xl text-center text-on-surface-variant">Sign in to view payments.</div>;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Payments</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Collections by method and full payment history.</p>
      </div>

      {/* Method breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {p.byMethod.map((m) => {
          const meta = METHOD_META[m.method];
          const pct = p.total > 0 ? Math.round((m.amount / p.total) * 100) : 0;
          return (
            <div key={m.method} className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
              <div className="flex items-center justify-between mb-sm">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}22`, color: meta.color }}>
                  <Icon name={meta.icon} size={20} />
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant">{m.count} txns</span>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{meta.label}</p>
              <p className="font-headline-lg text-headline-lg text-on-surface">{compactMoney(m.amount, currency)}</p>
              <div className="mt-sm w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* History */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Payment History</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Order</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Customer</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Method</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {p.history.length === 0 ? (
                <tr><td colSpan={5} className="p-xl text-center text-on-surface-variant">No payments yet.</td></tr>
              ) : (
                p.history.map((o) => {
                  const meta = o.paymentMethod ? METHOD_META[o.paymentMethod] : null;
                  return (
                    <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-md font-mono text-xs text-on-surface">{o.orderNumber}</td>
                      <td className="p-md text-on-surface-variant">{o.customerName}</td>
                      <td className="p-md text-on-surface">
                        <span className="inline-flex items-center gap-1.5">
                          {meta && (
                            <span style={{ color: meta.color }}>
                              <Icon name={meta.icon} size={16} />
                            </span>
                          )}
                          {meta?.label ?? "—"}
                        </span>
                      </td>
                      <td className="p-md">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${o.paid ? "bg-primary-container/20 text-primary" : "bg-tertiary-container/20 text-tertiary"}`}>
                          {o.paid ? "Paid" : "Due"}
                        </span>
                      </td>
                      <td className="p-md text-right font-semibold text-on-surface">{money(o.total, currency)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
