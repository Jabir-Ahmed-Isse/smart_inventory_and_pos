import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { money, compactMoney } from "@/lib/data";
import type { AgingRow } from "@/lib/finance/data";

const BUCKET_META: Record<AgingRow["bucket"], { label: string; cls: string }> = {
  current: { label: "Current", cls: "bg-primary-container/20 text-primary border border-primary/20" },
  "30": { label: "31–60 days", cls: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30" },
  "60": { label: "61–90 days", cls: "bg-secondary-container/20 text-secondary border border-secondary-container/30" },
  "90+": { label: "90+ days", cls: "bg-error-container/30 text-error border border-error-container/40" },
};

/** Shared receivables/payables layout: KPIs, aging buckets, and a table. */
export function AgingView({
  rows,
  currency,
  party,
  action,
  emptyText,
}: {
  rows: AgingRow[];
  currency: string;
  party: string; // "Customer" | "Supplier"
  action: string; // e.g. "owed to you" / "you owe"
  emptyText: string;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const overdue = rows.filter((r) => r.bucket !== "current").reduce((s, r) => s + r.amount, 0);
  const buckets = (["current", "30", "60", "90+"] as const).map((b) => ({
    key: b,
    ...BUCKET_META[b],
    amount: rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.amount, 0),
    count: rows.filter((r) => r.bucket === b).length,
  }));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label={`Total ${action === "you owe" ? "Payable" : "Receivable"}`} value={compactMoney(total, currency)} icon="account_balance_wallet" tone={total > 0 ? "warning" : "neutral"} sub={action} />
        <Kpi label="Open Items" value={String(rows.length)} icon="list_alt" tone="neutral" />
        <Kpi label="Overdue" value={compactMoney(overdue, currency)} icon="warning" tone={overdue > 0 ? "negative" : "neutral"} />
        <Kpi label="Current" value={compactMoney(buckets[0].amount, currency)} icon="event_available" tone="positive" />
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {buckets.map((b) => (
          <div key={b.key} className="bg-surface border border-outline-variant rounded-xl p-md">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${b.cls}`}>{b.label}</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-sm">{money(b.amount, currency)}</p>
            <p className="font-label-md text-label-md text-on-surface-variant">{b.count} item{b.count === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Reference</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">{party}</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Age</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Aging</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="p-xl text-center text-on-surface-variant"><Icon name="check_circle" size={28} className="text-primary mx-auto mb-2" />{emptyText}</td></tr>
              ) : (
                [...rows].sort((a, b) => b.days - a.days).map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md font-mono text-xs text-on-surface">{r.ref}</td>
                    <td className="p-md text-on-surface">{r.party}</td>
                    <td className="p-md text-on-surface-variant whitespace-nowrap">{r.date}</td>
                    <td className="p-md text-on-surface-variant">{r.days}d</td>
                    <td className="p-md">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${BUCKET_META[r.bucket].cls}`}>{BUCKET_META[r.bucket].label}</span>
                    </td>
                    <td className="p-md text-right font-semibold text-on-surface">{money(r.amount, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
