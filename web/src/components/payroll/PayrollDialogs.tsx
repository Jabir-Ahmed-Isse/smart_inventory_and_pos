import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createPayRun, createComponent, assignComponent, createAdvance, addPayAdjustment } from "@/lib/payroll/actions";

type Opt = { id: string; label: string };

export function NewPayRunDialog({ defaultName, periodStart, periodEnd }: { defaultName: string; periodStart: string; periodEnd: string }) {
  return (
    <CrudDialog triggerLabel="New Pay Run" title="New Pay Run" submitLabel="Create" action={createPayRun}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} defaultValue={defaultName} />
      </div>
      <div className="grid grid-cols-3 gap-md">
        <div>
          <label className={labelCls}>Period from *</label>
          <input name="period_start" type="date" required className={fieldCls} defaultValue={periodStart} />
        </div>
        <div>
          <label className={labelCls}>Period to *</label>
          <input name="period_end" type="date" required className={fieldCls} defaultValue={periodEnd} />
        </div>
        <div>
          <label className={labelCls}>Pay date</label>
          <input name="pay_date" type="date" className={fieldCls} defaultValue={periodEnd} />
        </div>
      </div>
    </CrudDialog>
  );
}

export function NewComponentDialog() {
  return (
    <CrudDialog triggerLabel="New Component" title="New Salary Component" submitLabel="Create" action={createComponent}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Name *</label>
          <input name="name" required className={fieldCls} placeholder="e.g. Transport Allowance" />
        </div>
        <div>
          <label className={labelCls}>Code</label>
          <input name="code" className={fieldCls} placeholder="e.g. TRANS" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Type *</label>
          <select name="component_type" className={`${fieldCls} appearance-none`} defaultValue="earning">
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Calculation</label>
          <select name="calc_method" className={`${fieldCls} appearance-none`} defaultValue="fixed">
            <option value="fixed">Fixed amount</option>
            <option value="percent_basic">% of basic</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Fixed amount</label>
          <input name="amount" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Rate (% of basic)</label>
          <input name="rate" type="number" min="0" step="0.1" className={fieldCls} placeholder="0" />
        </div>
      </div>
      <div className="flex items-center gap-lg pt-1">
        <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
          <input type="checkbox" name="applies_to_all" className="rounded border-outline-variant" /> Apply to all employees
        </label>
        <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
          <input type="checkbox" name="is_statutory" className="rounded border-outline-variant" /> Statutory
        </label>
      </div>
    </CrudDialog>
  );
}

export function AssignComponentDialog({ employees, components }: { employees: Opt[]; components: Opt[] }) {
  return (
    <CrudDialog triggerLabel="Assign to Employee" title="Assign Component" submitLabel="Assign" action={assignComponent}
      triggerClassName="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-high transition-colors">
      <div>
        <label className={labelCls}>Employee *</label>
        <select name="employee_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Component *</label>
        <select name="component_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select…</option>
          {components.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Amount override</label>
        <input name="amount" type="number" min="0" step="0.01" className={fieldCls} placeholder="Leave blank to use the component default" />
      </div>
    </CrudDialog>
  );
}

export function AddAdjustmentDialog({ runId, employeeId, employeeName }: { runId: string; employeeId: string; employeeName: string }) {
  return (
    <CrudDialog triggerLabel="Bonus / adjustment" triggerIcon="add" title={`Adjustment — ${employeeName}`} submitLabel="Add" action={addPayAdjustment}
      triggerClassName="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
      <input type="hidden" name="pay_run_id" value={runId} />
      <input type="hidden" name="employee_id" value={employeeId} />
      <div>
        <label className={labelCls}>Type *</label>
        <select name="adjustment_type" className={`${fieldCls} appearance-none`} defaultValue="earning">
          <option value="earning">Bonus / earning (adds to pay)</option>
          <option value="deduction">Deduction (reduces pay)</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Name *</label>
        <input name="label" required className={fieldCls} placeholder="e.g. Eid Bonus, Overtime, Fine" />
      </div>
      <div>
        <label className={labelCls}>Amount *</label>
        <input name="amount" type="number" min="0" step="0.01" required className={fieldCls} placeholder="0.00" />
      </div>
      <p className="font-label-md text-label-md text-on-surface-variant">Applies to this pay run only. The payslip rebuilds automatically.</p>
    </CrudDialog>
  );
}

export function NewAdvanceDialog({ employees }: { employees: Opt[] }) {
  return (
    <CrudDialog triggerLabel="New Advance / Loan" title="Advance or Loan Request" submitLabel="Submit" action={createAdvance}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Employee *</label>
        <select name="employee_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-md">
        <div>
          <label className={labelCls}>Type *</label>
          <select name="advance_type" className={`${fieldCls} appearance-none`} defaultValue="advance">
            <option value="advance">Advance</option>
            <option value="loan">Loan</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Amount *</label>
          <input name="amount" type="number" min="0" step="0.01" required className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Installments</label>
          <input name="installments" type="number" min="1" step="1" defaultValue="1" className={fieldCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Reason</label>
        <input name="reason" className={fieldCls} placeholder="Optional" />
      </div>
      <p className="font-label-md text-label-md text-on-surface-variant">
        An <strong>advance</strong> is deducted in full from the next payslip. A <strong>loan</strong> is split across the number of installments and auto-deducted each pay run.
      </p>
    </CrudDialog>
  );
}
