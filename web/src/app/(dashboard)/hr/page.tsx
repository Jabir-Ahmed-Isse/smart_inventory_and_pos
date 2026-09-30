import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { AddEmployeeDialog } from "@/components/hr/HrDialogs";
import { getActiveOrg } from "@/lib/org";
import { compactMoney } from "@/lib/data";
import { loadEmployees, loadDepartments, loadPositions, loadLeaveRequests, hrOverview } from "@/lib/hr/data";

export const metadata = { title: "HR — Inventory Pro" };

const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
  temporary: "Temporary",
};

export default async function HrOverviewPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [employees, departments, positions, leave] = await Promise.all([
    loadEmployees(org.orgId),
    loadDepartments(org.orgId),
    loadPositions(org.orgId),
    loadLeaveRequests(org.orgId),
  ]);
  const o = hrOverview(employees, departments, leave);
  const currency = org.currency;
  const deptOpts = departments.map((d) => ({ id: d.id, label: d.name }));
  const posOpts = positions.map((p) => ({ id: p.id, label: p.title }));
  const maxDept = Math.max(1, ...o.byDepartment.map((d) => d.count));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Human Resources</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">People, departments, leave and attendance.</p>
        </div>
        <AddEmployeeDialog departments={deptOpts} positions={posOpts} />
      </div>

      {employees.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-md">
            <Icon name="groups" size={28} filled />
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Build your team</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
            Add your first employee to start managing payroll, leave and attendance. Set up departments first if you like.
          </p>
          <div className="flex items-center justify-center gap-sm">
            <AddEmployeeDialog departments={deptOpts} positions={posOpts} />
            <Link href="/hr/departments" className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
              Manage departments
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md mb-lg">
            <Kpi label="Headcount" value={String(o.headcount)} icon="groups" tone="neutral" />
            <Kpi label="Active" value={String(o.active)} icon="how_to_reg" tone="positive" />
            <Kpi label="On Leave" value={String(o.onLeave)} icon="beach_access" tone={o.onLeave > 0 ? "warning" : "neutral"} />
            <Kpi label="New Hires" value={String(o.newHires)} icon="person_add" tone="neutral" sub="this month" />
            <Kpi label="Pending Leave" value={String(o.pendingLeave)} icon="pending_actions" tone={o.pendingLeave > 0 ? "warning" : "neutral"} />
            <Kpi label="Monthly Payroll" value={compactMoney(o.monthlyPayroll, currency)} icon="payments" tone="neutral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Headcount by Department</h3>
              {o.byDepartment.length === 0 ? (
                <p className="text-on-surface-variant font-body-sm text-body-sm py-lg text-center">No departments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {o.byDepartment.map((d) => (
                    <li key={d.name}>
                      <div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
                        <span className="text-on-surface">{d.name}</span>
                        <span className="text-on-surface-variant tabular-nums">{d.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Workforce Mix</h3>
              <ul className="space-y-2">
                {o.byType.map((t) => (
                  <li key={t.type} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant">
                    <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                      <Icon name="work" size={16} className="text-on-surface-variant" /> {TYPE_LABEL[t.type] ?? t.type}
                    </span>
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">{t.count}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-md flex gap-sm">
                <Link href="/hr/leave" className="flex-1 text-center py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">Leave requests</Link>
                <Link href="/hr/attendance" className="flex-1 text-center py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">Attendance</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
