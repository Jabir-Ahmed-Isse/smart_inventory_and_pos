import { Icon } from "@/components/Icon";
import { NewExpenseCategoryDialog } from "@/components/expenses/ExpenseDialogs";
import { SeedExpensesButton } from "@/components/expenses/ExpenseActions";
import { getActiveOrg } from "@/lib/org";
import { loadExpenseCategories } from "@/lib/expenses/data";
import { loadAccounts } from "@/lib/accounting/data";

export const metadata = { title: "Expense Categories — Inventory Pro" };

export default async function ExpenseCategoriesPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [categories, accounts] = await Promise.all([loadExpenseCategories(org.orgId), loadAccounts(org.orgId)]);
  const accountOpts = accounts.filter((a) => a.type === "expense").map((a) => ({ id: a.id, label: `${a.code} · ${a.name}` }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Expense Categories</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Each category posts to a ledger expense account.</p>
        </div>
        <div className="flex flex-wrap gap-sm items-center">
          {categories.length === 0 && <SeedExpensesButton />}
          <NewExpenseCategoryDialog accounts={accountOpts} />
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-md">
            <Icon name="category" size={28} filled />
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">No categories yet</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
            Install the default set (Rent, Utilities, Office Supplies, Marketing, Bank Charges, Other) mapped to your Chart of Accounts, or create your own.
          </p>
          <div className="flex items-center justify-center gap-sm">
            <SeedExpensesButton />
            <NewExpenseCategoryDialog accounts={accountOpts} />
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/60">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-md py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                  <Icon name="sell" size={18} />
                </div>
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface">{c.name}{!c.active && <span className="ml-2 text-label-md text-on-surface-variant">(inactive)</span>}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    {c.accountName ? <>Posts to {c.accountName}</> : <span className="text-tertiary">No ledger account — uses Other Expense</span>}
                  </p>
                </div>
              </div>
              <Icon name={c.accountName ? "link" : "link_off"} size={18} className={c.accountName ? "text-primary" : "text-on-surface-variant/50"} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
