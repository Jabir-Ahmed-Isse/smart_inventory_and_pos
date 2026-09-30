import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadExpenses, loadRecurringExpenses, expensesOverview } from "@/lib/expenses/data";

export const metadata = { title: "Expenses — Inventory Pro" };

export default async function ExpensesOverviewPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [expenses, recurring] = await Promise.all([loadExpenses(org.orgId), loadRecurringExpenses(org.orgId)]);
  const o = expensesOverview(expenses, recurring);
  const currency = org.currency;
  const maxCat = Math.max(1, ...o.byCategory.map((c) => c.amount));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Expenses &amp; Bills</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Rent, utilities, vendor bills and recurring costs — posted to your ledger.</p>
        </div>
        <Link href="/expenses/bills" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
          <Icon name="receipt_long" size={18} /> Go to Bills
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="This Month" value={compactMoney(o.monthTotal, currency)} icon="calendar_month" tone="warning" />
        <Kpi label="Unpaid (Payable)" value={compactMoney(o.unpaid, currency)} icon="call_made" tone={o.unpaid > 0 ? "negative" : "neutral"} sub="approved, not paid" />
        <Kpi label="Draft" value={String(o.draftCount)} icon="edit_note" tone={o.draftCount > 0 ? "warning" : "neutral"} sub="awaiting approval" />
        <Kpi label="Recurring Due" value={String(o.dueRecurring)} icon="event_repeat" tone={o.dueRecurring > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Spend by Category</h3>
          {o.byCategory.length === 0 ? (
            <p className="text-on-surface-variant font-body-sm text-body-sm py-lg text-center">No expenses recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {o.byCategory.map((c) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
                    <span className="text-on-surface">{c.name}</span>
                    <span className="text-on-surface-variant tabular-nums">{money(c.amount, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm flex flex-col">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Quick Actions</h3>
          <div className="space-y-2 flex-1">
            <QuickLink href="/expenses/bills" icon="receipt_long" label="Record a bill or expense" desc="Rent, utilities, one-off costs" />
            <QuickLink href="/expenses/recurring" icon="event_repeat" label="Set up recurring costs" desc="Auto-generate rent every month" />
            <QuickLink href="/expenses/categories" icon="category" label="Manage categories" desc="Map spend to ledger accounts" />
          </div>
        </div>
      </div>
    </main>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant group-hover:text-primary flex items-center justify-center shrink-0">
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body-sm text-body-sm text-on-surface">{label}</p>
        <p className="font-label-md text-label-md text-on-surface-variant">{desc}</p>
      </div>
      <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
    </Link>
  );
}
