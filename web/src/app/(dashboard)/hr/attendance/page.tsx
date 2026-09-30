import { Icon } from "@/components/Icon";
import { MarkAttendanceDialog } from "@/components/hr/HrDialogs";
import { AttendanceDateNav } from "@/components/hr/HrActions";
import { getActiveOrg } from "@/lib/org";
import { loadEmployees, loadAttendance, type AttendanceRow } from "@/lib/hr/data";

export const metadata = { title: "Attendance — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  present: "bg-primary-container/20 text-primary",
  remote: "bg-primary-container/20 text-primary",
  late: "bg-tertiary-container/20 text-tertiary",
  half_day: "bg-tertiary-container/20 text-tertiary",
  on_leave: "bg-secondary-container/20 text-secondary",
  holiday: "bg-surface-container-high text-on-surface-variant",
  absent: "bg-error-container/30 text-error",
};

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const today = new Date().toISOString().slice(0, 10);
  const { date } = await searchParams;
  const workDate = date ?? today;

  const [employees, records] = await Promise.all([loadEmployees(org.orgId), loadAttendance(org.orgId, workDate)]);
  const empOpts = employees.filter((e) => e.status !== "terminated").map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNumber})` }));

  const marked = new Map(records.map((r) => [r.employeeId, r]));
  const active = employees.filter((e) => e.status !== "terminated");
  const counts = {
    present: records.filter((r) => r.status === "present" || r.status === "remote").length,
    absent: records.filter((r) => r.status === "absent").length,
    leave: records.filter((r) => r.status === "on_leave").length,
    unmarked: active.filter((e) => !marked.has(e.id)).length,
  };

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Attendance</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Daily attendance register.</p>
        </div>
        <div className="flex items-center gap-sm">
          <AttendanceDateNav date={workDate} />
          {employees.length > 0 && <MarkAttendanceDialog employees={empOpts} defaultDate={workDate} />}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md mb-lg">
        <Stat label="Present" value={counts.present} tone="text-primary" icon="how_to_reg" />
        <Stat label="On Leave" value={counts.leave} tone="text-secondary" icon="beach_access" />
        <Stat label="Absent" value={counts.absent} tone="text-error" icon="person_off" />
        <Stat label="Not Marked" value={counts.unmarked} tone="text-on-surface-variant" icon="help" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-md py-3 font-medium">Employee</th>
                <th className="px-md py-3 font-medium">Status</th>
                <th className="px-md py-3 font-medium">Check in</th>
                <th className="px-md py-3 font-medium">Check out</th>
                <th className="px-md py-3 font-medium text-right">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {active.length === 0 ? (
                <tr><td colSpan={5} className="px-md py-8 text-center font-body-sm text-body-sm text-on-surface-variant">No active employees.</td></tr>
              ) : (
                active.map((e) => {
                  const r: AttendanceRow | undefined = marked.get(e.id);
                  return (
                    <tr key={e.id} className="hover:bg-surface-container-high/40">
                      <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{e.fullName}</td>
                      <td className="px-md py-3">
                        {r ? (
                          <span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[r.status]}`}>{r.status.replace("_", " ")}</span>
                        ) : (
                          <span className="font-label-md text-label-md text-on-surface-variant">— not marked</span>
                        )}
                      </td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant tabular-nums">{r?.checkIn?.slice(0, 5) ?? "—"}</td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant tabular-nums">{r?.checkOut?.slice(0, 5) ?? "—"}</td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r && r.hours > 0 ? r.hours : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center ${tone}`}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <p className={`font-headline-lg text-headline-lg tabular-nums ${tone}`}>{value}</p>
        <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
