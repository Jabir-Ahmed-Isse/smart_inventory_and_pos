import { Icon } from "@/components/Icon";
import { RequestLeaveDialog } from "@/components/hr/HrDialogs";
import { LeaveDecision, SeedLeaveTypesButton } from "@/components/hr/HrActions";
import { getActiveOrg } from "@/lib/org";
import { loadEmployees, loadLeaveTypes, loadLeaveRequests } from "@/lib/hr/data";

export const metadata = { title: "Leave — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  pending: "bg-tertiary-container/20 text-tertiary",
  approved: "bg-primary-container/20 text-primary",
  rejected: "bg-error-container/30 text-error",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

export default async function LeavePage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [employees, leaveTypes, requests] = await Promise.all([
    loadEmployees(org.orgId),
    loadLeaveTypes(org.orgId),
    loadLeaveRequests(org.orgId),
  ]);
  const empOpts = employees.filter((e) => e.status !== "terminated").map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNumber})` }));
  const typeOpts = leaveTypes.map((t) => ({ id: t.id, label: t.name }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Leave Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Requests, approvals and leave policies.</p>
        </div>
        {employees.length > 0 && <RequestLeaveDialog employees={empOpts} leaveTypes={typeOpts} />}
      </div>

      {/* Leave types */}
      <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm mb-lg">
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Leave Policies</h3>
          {leaveTypes.length === 0 && <SeedLeaveTypesButton />}
        </div>
        {leaveTypes.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">No leave types configured. Install the standard set to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leaveTypes.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant font-label-md text-label-md text-on-surface">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color ?? "#888" }} />
                {t.name} · {t.defaultDays}d · {t.isPaid ? "paid" : "unpaid"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Requests */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-md py-3 border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant/60">
                <th className="px-md py-2 font-medium">Employee</th>
                <th className="px-md py-2 font-medium">Type</th>
                <th className="px-md py-2 font-medium">Dates</th>
                <th className="px-md py-2 font-medium text-right">Days</th>
                <th className="px-md py-2 font-medium">Status</th>
                <th className="px-md py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="px-md py-8 text-center font-body-sm text-body-sm text-on-surface-variant">No leave requests yet.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{r.employeeName}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{r.leaveTypeName ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                      {new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(r.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r.days}</td>
                    <td className="px-md py-3"><span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[r.status]}`}>{r.status}</span></td>
                    <td className="px-md py-3"><LeaveDecision id={r.id} status={r.status} /></td>
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
