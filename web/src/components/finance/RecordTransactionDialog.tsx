import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createTransaction } from "@/lib/finance/actions";

const INCOME_CATS = ["Sales Revenue", "Service Income", "Interest", "Capital Injection", "Other Income"];
const EXPENSE_CATS = ["Inventory Restock", "Rent", "Utilities", "Salaries", "Marketing", "Refunds", "Other Expense"];

/** "Record Transaction" dialog — logs a manual income or expense. */
export function RecordTransactionDialog({
  defaultType = "expense",
  triggerLabel = "Record Transaction",
  triggerClassName,
}: {
  defaultType?: "income" | "expense";
  triggerLabel?: string;
  triggerClassName?: string;
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
