import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createTransaction } from "@/lib/finance/actions";
import type { AccountLite } from "@/lib/accounts/data";

const INCOME_CATS = ["Sales Revenue", "Service Income", "Interest", "Capital Injection", "Other Income"];
const EXPENSE_CATS = ["Inventory Restock", "Rent", "Utilities", "Salaries", "Marketing", "Refunds", "Other Expense"];

const KIND_LABEL: Record<string, string> = { bank: "Bank", mobile: "Mobile money", cash: "Cash" };

/** "Record Transaction" dialog — logs a manual income or expense. */
export function RecordTransactionDialog({
  defaultType = "expense",
  triggerLabel = "Record Transaction",
  triggerClassName,
  accounts = [],
}: {
  defaultType?: "income" | "expense";
  triggerLabel?: string;
  triggerClassName?: string;
  /** Active Cash & Bank accounts the money can be deposited into / paid from. */
  accounts?: AccountLite[];
}) {
  return (
    <CrudDialog
      triggerLabel={triggerLabel}
      triggerIcon="add"
      title="Record Transaction"
      submitLabel="Save Transaction"
      action={createTransaction}
      triggerClassName={triggerClassName ?? "flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm"}
    >
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Type *</label>
          <select name="type" required className={`${fieldCls} appearance-none`} defaultValue={defaultType}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Amount *</label>
          <input name="amount" required type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Category</label>
        <input name="category" list="finance-cats" className={fieldCls} placeholder="e.g. Rent" defaultValue="" />
        <datalist id="finance-cats">
          {[...INCOME_CATS, ...EXPENSE_CATS].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      {accounts.length > 0 && (
        <div>
          <label className={labelCls}>Account (money in / out)</label>
          <select name="account_id" className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="">Not tied to an account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {KIND_LABEL[a.kind] ?? a.kind}
              </option>
            ))}
          </select>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs text-[13px]">
            Pick which Cash &amp; Bank account this affects, so its balance updates. Leave blank for a general entry.
          </p>
        </div>
      )}
      <div>
        <label className={labelCls}>Description</label>
        <input name="description" className={fieldCls} placeholder="What was this for?" />
      </div>
      <div>
        <label className={labelCls}>Date</label>
        <input name="date" type="date" className={fieldCls} />
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs text-[13px]">Leave blank to use today.</p>
      </div>
    </CrudDialog>
  );
}
