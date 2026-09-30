import { Icon } from "@/components/Icon";
import { NewRecurringDialog } from "@/components/expenses/ExpenseDialogs";
import { GenerateDueButton } from "@/components/expenses/ExpenseActions";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadRecurringExpenses, loadExpenseCategories, loadSuppliersLite } from "@/lib/expenses/data";

export const metadata = { title: "Recurring Expenses — Inventory Pro" };

const RECUR_LABEL: Record<string, string> = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

export default async function RecurringPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [recurring, categories, suppliers] = await Promise.all([
    loadRecurringExpenses(org.orgId),
    loadExpenseCategories(org.orgId),
    loadSuppliersLite(org.orgId),
  ]);
  const currency = org.currency;
  const catOpts = categories.filter((c) => c.active).map((c) => ({ id: c.id, label: c.name }));
  const supOpts = suppliers.map((s) => ({ id: s.id, label: s.name }));
  const dueCount = recurring.filter((r) => r.due).length;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Recurring Expenses</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Rent, utilities, subscriptions — bills generate automatically on schedule.</p>
        </div>
        <div className="flex flex-wrap gap-sm items-center">
          <GenerateDueButton />
          <NewRecurringDialog categories={catOpts} suppliers={supOpts} />
        </div>
      </div>

      {dueCount > 0 && (
        <div className="mb-lg rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-md py-3 flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
          <Icon name="notification_important" size={18} className="text-tertiary" />
          {dueCount} recurring expense{dueCount > 1 ? "s are" : " is"} due — click “Generate due bills” to create the draft bills.
        </div>
      )}

      {recurring.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="event_repeat" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No recurring expenses yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Set up monthly rent so it bills itself every period.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-md py-3 font-medium">Name</th>
                  <th className="px-md py-3 font-medium">Category</th>
                  <th className="px-md py-3 font-medium">Frequency</th>
                  <th className="px-md py-3 font-medium">Next due</th>
                  <th className="px-md py-3 font-medium text-right">Amount</th>
                  <th className="px-md py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {recurring.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{r.name}{r.supplierName ? <span className="block font-label-md text-label-md text-on-surface-variant">{r.supplierName}</span> : null}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{r.categoryName ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{RECUR_LABEL[r.recurrence]}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm whitespace-nowrap">
                      <span className={r.due ? "text-error font-medium" : "text-on-surface-variant"}>
                        {new Date(r.nextDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(r.total, currency)}</td>
                    <td className="px-md py-3">
                      {r.active
                        ? <span className="font-label-md text-label-md px-2 py-0.5 rounded-full bg-primary-container/20 text-primary">Active</span>
                        : <span className="font-label-md text-label-md px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Paused</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
