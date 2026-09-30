import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createAccount } from "@/lib/accounting/actions";

const SUBTYPES = [
  "current_asset",
  "fixed_asset",
  "current_liability",
  "long_term_liability",
  "equity",
  "operating_income",
  "other_income",
  "contra_income",
  "cogs",
  "operating_expense",
];

/** "New Account" dialog — adds a line to the Chart of Accounts. */
export function NewAccountDialog() {
  return (
    <CrudDialog
      triggerLabel="New Account"
      triggerIcon="add"
      title="New Account"
      submitLabel="Create Account"
      action={createAccount}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm"
    >
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Code *</label>
          <input name="code" required className={fieldCls} placeholder="e.g. 6700" />
        </div>
        <div>
          <label className={labelCls}>Type *</label>
          <select name="type" required className={`${fieldCls} appearance-none`} defaultValue="expense">
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="equity">Equity</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="e.g. Insurance Expense" />
      </div>
      <div>
        <label className={labelCls}>Subtype</label>
        <input name="subtype" list="acc-subtypes" className={fieldCls} placeholder="e.g. operating_expense" />
        <datalist id="acc-subtypes">
          {SUBTYPES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input name="description" className={fieldCls} placeholder="Optional notes" />
      </div>
    </CrudDialog>
  );
}
