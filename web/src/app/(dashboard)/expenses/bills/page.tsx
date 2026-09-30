import { Icon } from "@/components/Icon";
import { NewExpenseDialog } from "@/components/expenses/ExpenseDialogs";
import { ExpenseRowActions, SeedExpensesButton } from "@/components/expenses/ExpenseActions";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadExpenses, loadExpenseCategories, loadSuppliersLite } from "@/lib/expenses/data";

export const metadata = { title: "Bills & Expenses — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-tertiary-container/20 text-tertiary",
  approved: "bg-secondary-container/20 text-secondary",
  paid: "bg-primary-container/20 text-primary",
  cancelled: "bg-surface-container-high text-on-surface-variant line-through",
};

export default async function BillsPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [expenses, categories, suppliers] = await Promise.all([
    loadExpenses(org.orgId),
    loadExpenseCategories(org.orgId),
    loadSuppliersLite(org.orgId),
  ]);
  const currency = org.currency;
  const catOpts = categories.filter((c) => c.active).map((c) => ({ id: c.id, label: c.name }));
  const supOpts = suppliers.map((s) => ({ id: s.id, label: s.name }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Bills &amp; Expenses</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Record → approve → pay. Each step posts to your ledger.</p>
        </div>
        <div className="flex flex-wrap gap-sm items-center">
          {categories.length === 0 && <SeedExpensesButton />}
          <NewExpenseDialog categories={catOpts} suppliers={supOpts} />
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="receipt_long" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No expenses recorded yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Record your first bill — rent, utilities, supplies.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-md py-3 font-medium">Expense</th>
                  <th className="px-md py-3 font-medium">Category</th>
                  <th className="px-md py-3 font-medium">Payee</th>
                  <th className="px-md py-3 font-medium">Date</th>
                  <th className="px-md py-3 font-medium text-right">Amount</th>
                  <th className="px-md py-3 font-medium">Status</th>
                  <th className="px-md py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3">
                      <p className="font-body-sm text-body-sm text-on-surface">{e.description ?? e.expenseNumber}</p>
                      <p className="font-label-md text-label-md text-on-surface-variant">{e.expenseNumber}</p>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{e.categoryName ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{e.supplierName ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">{new Date(e.expenseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-md py-3 text-right">
                      <span className="font-body-sm text-body-sm text-on-surface tabular-nums">{money(e.total, currency)}</span>
                      {e.taxAmount > 0 && <span className="block font-label-md text-label-md text-on-surface-variant">incl. {money(e.taxAmount, currency)} tax</span>}
                    </td>
                    <td className="px-md py-3"><span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[e.status]}`}>{e.status}</span></td>
                    <td className="px-md py-3"><ExpenseRowActions id={e.id} status={e.status} /></td>
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
