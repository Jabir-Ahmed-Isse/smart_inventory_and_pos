import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AddEmployeeDialog } from "@/components/hr/HrDialogs";
import { EmployeeStatusControl } from "@/components/hr/HrActions";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadEmployees, loadDepartments, loadPositions } from "@/lib/hr/data";

export const metadata = { title: "Employees — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  active: "bg-primary-container/20 text-primary",
  on_leave: "bg-tertiary-container/20 text-tertiary",
  suspended: "bg-error-container/30 text-error",
  terminated: "bg-surface-container-high text-on-surface-variant",
};
const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", intern: "Intern", temporary: "Temporary",
};

export default async function EmployeesPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [employees, departments, positions] = await Promise.all([
    loadEmployees(org.orgId),
    loadDepartments(org.orgId),
    loadPositions(org.orgId),
  ]);
  const currency = org.currency;
  const deptOpts = departments.map((d) => ({ id: d.id, label: d.name }));
  const posOpts = positions.map((p) => ({ id: p.id, label: p.title }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Employees</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{employees.length} people on the roster.</p>
        </div>
        <div className="flex items-center gap-sm self-start">
          <Link href="/hr/employees/import" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="upload_file" size={18} /> Import
          </Link>
          <AddEmployeeDialog departments={deptOpts} positions={posOpts} />
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-md py-3 font-medium">Employee</th>
                <th className="px-md py-3 font-medium">Department</th>
                <th className="px-md py-3 font-medium">Position</th>
                <th className="px-md py-3 font-medium">Type</th>
                <th className="px-md py-3 font-medium text-right">Salary</th>
                <th className="px-md py-3 font-medium">Hired</th>
                <th className="px-md py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {employees.length === 0 ? (
                <tr><td colSpan={7} className="px-md py-8 text-center font-body-sm text-body-sm text-on-surface-variant">No employees yet.</td></tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-container/30 text-primary flex items-center justify-center font-label-md text-label-md shrink-0">
                          {e.firstName[0]}{e.lastName?.[0] ?? ""}
                        </div>
                        <div className="min-w-0">
                          <p className="font-body-sm text-body-sm text-on-surface truncate">{e.fullName}</p>
                          <p className="font-label-md text-label-md text-on-surface-variant">{e.employeeNumber}{e.email ? ` · ${e.email}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{e.departmentName ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{e.positionTitle ?? "—"}</td>
                    <td className="px-md py-3 font-label-md text-label-md text-on-surface-variant">{TYPE_LABEL[e.employmentType]}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(e.baseSalary, currency)}<span className="text-on-surface-variant text-label-md">/{e.payFrequency.slice(0, 2)}</span></td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">{new Date(e.hireDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-md py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`hidden sm:inline font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[e.status]}`}>{e.status.replace("_", " ")}</span>
                        <EmployeeStatusControl id={e.id} status={e.status} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
