import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import {
  createDepartment,
  createPosition,
  createEmployee,
  createLeaveRequest,
  markAttendance,
} from "@/lib/hr/actions";

type Opt = { id: string; label: string };

export function AddDepartmentDialog() {
  return (
    <CrudDialog triggerLabel="New Department" title="New Department" submitLabel="Create" action={createDepartment}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Name *</label>
          <input name="name" required className={fieldCls} placeholder="e.g. Sales" />
        </div>
        <div>
          <label className={labelCls}>Code</label>
          <input name="code" className={fieldCls} placeholder="e.g. SAL" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input name="description" className={fieldCls} placeholder="Optional" />
      </div>
    </CrudDialog>
  );
}

export function AddPositionDialog({ departments }: { departments: Opt[] }) {
  return (
    <CrudDialog triggerLabel="New Position" title="New Position" submitLabel="Create" action={createPosition}
      triggerClassName="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-high transition-colors">
      <div>
        <label className={labelCls}>Title *</label>
        <input name="title" required className={fieldCls} placeholder="e.g. Store Manager" />
      </div>
      <div>
        <label className={labelCls}>Department</label>
        <select name="department_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">—</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input name="description" className={fieldCls} placeholder="Optional" />
      </div>
    </CrudDialog>
  );
}

export function AddEmployeeDialog({ departments, positions }: { departments: Opt[]; positions: Opt[] }) {
  return (
    <CrudDialog triggerLabel="Add Employee" title="Add Employee" submitLabel="Add Employee" action={createEmployee}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>First name *</label>
          <input name="first_name" required className={fieldCls} placeholder="Amina" />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input name="last_name" className={fieldCls} placeholder="Yusuf" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Employee no.</label>
          <input name="employee_number" className={fieldCls} placeholder="Auto if blank" />
        </div>
        <div>
          <label className={labelCls}>Hire date</label>
          <input name="hire_date" type="date" className={fieldCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" type="email" className={fieldCls} placeholder="name@company.com" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" className={fieldCls} placeholder="+252…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Department</label>
          <select name="department_id" className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Position</label>
          <select name="position_id" className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="">—</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-md">
        <div>
          <label className={labelCls}>Employment</label>
          <select name="employment_type" className={`${fieldCls} appearance-none`} defaultValue="full_time">
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Base salary</label>
          <input name="base_salary" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Pay cycle</label>
          <select name="pay_frequency" className={`${fieldCls} appearance-none`} defaultValue="monthly">
            <option value="monthly">Monthly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Bank / account</label>
          <input name="bank_name" className={fieldCls} placeholder="Bank name" />
        </div>
        <div>
          <label className={labelCls}>Mobile money</label>
          <input name="mobile_money" className={fieldCls} placeholder="e.g. EVC number" />
        </div>
      </div>
    </CrudDialog>
  );
}

export function RequestLeaveDialog({ employees, leaveTypes }: { employees: Opt[]; leaveTypes: Opt[] }) {
  return (
    <CrudDialog triggerLabel="Request Leave" title="New Leave Request" submitLabel="Submit" action={createLeaveRequest}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div>
        <label className={labelCls}>Employee *</label>
        <select name="employee_id" required className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="" disabled>Select…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Leave type</label>
        <select name="leave_type_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">—</option>
          {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-md">
        <div>
          <label className={labelCls}>From *</label>
          <input name="start_date" type="date" required className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>To *</label>
          <input name="end_date" type="date" required className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Days</label>
          <input name="days" type="number" min="0" step="0.5" className={fieldCls} placeholder="Auto" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Reason</label>
        <input name="reason" className={fieldCls} placeholder="Optional" />
      </div>
    </CrudDialog>
  );
}

export function MarkAttendanceDialog({ employees, defaultDate }: { employees: Opt[]; defaultDate: string }) {
  return (
    <CrudDialog triggerLabel="Record Attendance" title="Record Attendance" submitLabel="Save" action={markAttendance}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Employee *</label>
          <select name="employee_id" required className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="" disabled>Select…</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date *</label>
          <input name="work_date" type="date" required className={fieldCls} defaultValue={defaultDate} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Status</label>
        <select name="status" className={`${fieldCls} appearance-none`} defaultValue="present">
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="half_day">Half day</option>
          <option value="remote">Remote</option>
          <option value="on_leave">On leave</option>
          <option value="absent">Absent</option>
          <option value="holiday">Holiday</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-md">
        <div>
          <label className={labelCls}>Check in</label>
          <input name="check_in" type="time" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Check out</label>
          <input name="check_out" type="time" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Hours</label>
          <input name="hours" type="number" min="0" step="0.25" className={fieldCls} placeholder="Auto" />
        </div>
      </div>
    </CrudDialog>
  );
}
