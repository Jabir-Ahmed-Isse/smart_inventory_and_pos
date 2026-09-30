import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createExpense, createExpenseCategory, createRecurringExpense } from "@/lib/expenses/actions";

type Opt = { id: string; label: string };

function CategorySupplierFields({ categories, suppliers }: { categories: Opt[]; suppliers: Opt[] }) {
  return (
    <div className="grid grid-cols-2 gap-md">
      <div>
        <label className={labelCls}>Category</label>
        <select name="category_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Supplier / payee</label>
        <select name="supplier_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">—</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

export function NewExpenseDialog({ categories, suppliers }: { categories: Opt[]; suppliers: Opt[] }) {
  return (
    <CrudDialog triggerLabel="Record Expense" title="Record Expense / Bill" submitLabel="Save" action={createExpense}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Description</label>
        <input name="description" className={fieldCls} placeholder="e.g. October office rent" />
      </div>
      <CategorySupplierFields categories={categories} suppliers={suppliers} />
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Amount *</label>
          <input name="amount" type="number" min="0" step="0.01" required className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Tax / VAT</label>
          <input name="tax_amount" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Expense date</label>
          <input name="expense_date" type="date" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Due date</label>
          <input name="due_date" type="date" className={fieldCls} />
        </div>
      </div>
    </CrudDialog>
  );
}

export function NewExpenseCategoryDialog({ accounts }: { accounts: Opt[] }) {
  return (
    <CrudDialog triggerLabel="New Category" title="New Expense Category" submitLabel="Create" action={createExpenseCategory}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="e.g. Insurance" />
      </div>
      <div>
        <label className={labelCls}>Ledger account</label>
        <select name="account_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">— (uses Other Expense)</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Expenses in this category post to this account.</p>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input name="description" className={fieldCls} placeholder="Optional" />
      </div>
    </CrudDialog>
  );
}

export function NewRecurringDialog({ categories, suppliers }: { categories: Opt[]; suppliers: Opt[] }) {
  return (
    <CrudDialog triggerLabel="New Recurring" title="New Recurring Expense" submitLabel="Create" action={createRecurringExpense}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="e.g. Shop rent" />
      </div>
      <CategorySupplierFields categories={categories} suppliers={suppliers} />
      <div className="grid grid-cols-3 gap-md">
        <div>
          <label className={labelCls}>Amount *</label>
          <input name="amount" type="number" min="0" step="0.01" required className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Tax / VAT</label>
          <input name="tax_amount" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Every *</label>
          <select name="recurrence" className={`${fieldCls} appearance-none`} defaultValue="monthly">
            <option value="weekly">Week</option>
            <option value="monthly">Month</option>
            <option value="quarterly">Quarter</option>
            <option value="yearly">Year</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Starts *</label>
          <input name="start_date" type="date" required className={fieldCls} defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className={labelCls}>First due</label>
          <input name="next_due_date" type="date" className={fieldCls} />
        </div>
      </div>
    </CrudDialog>
  );
}
