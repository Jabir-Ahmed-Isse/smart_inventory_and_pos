import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createBudget, setBudgetLine } from "@/lib/budgets/actions";

export function NewBudgetDialog() {
  const year = new Date().getFullYear();
  return (
    <CrudDialog triggerLabel="New Budget" title="New Budget" submitLabel="Create" action={createBudget}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder={`e.g. ${year} Operating Budget`} />
      </div>
      <div>
        <label className={labelCls}>Fiscal year *</label>
        <input name="fiscal_year" type="number" min="2000" max="2100" required className={fieldCls} defaultValue={year} />
      </div>
    </CrudDialog>
  );
}

export function SetBudgetLineDialog({ budgetId, accounts }: { budgetId: string; accounts: { id: string; label: string }[] }) {
  return (
    <CrudDialog triggerLabel="Set Budget Line" title="Set Budget Line" submitLabel="Save" action={setBudgetLine}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <input type="hidden" name="budget_id" value={budgetId} />
      <div>
        <label className={labelCls}>Account *</label>
        <select name="account_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Annual amount *</label>
        <input name="annual_amount" type="number" min="0" step="0.01" required className={fieldCls} placeholder="0.00" />
      </div>
    </CrudDialog>
  );
}
