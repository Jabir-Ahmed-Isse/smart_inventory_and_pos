import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import { getTimesheets, type TimesheetStatus } from "@/lib/features/data";
import { logTimesheet } from "@/lib/features/actions";

export const metadata = { title: "Timesheets — Inventory Pro" };

const STATUS_PILL: Record<TimesheetStatus, string> = {
  open: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  submitted: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
  approved: "bg-primary-container/20 text-primary border border-primary/20",
  rejected: "bg-error-container/20 text-error border border-error-container/30",
};

export default async function TimesheetsPage() {
  const org = await getActiveOrg();
  const rows = org ? await getTimesheets(org.orgId, org.userId) : [];
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const mine = rows.filter((r) => r.isSelf);
  const myHours = mine.reduce((s, r) => s + r.hours, 0);

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Timesheets</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Log worked hours and track team time.
          </p>
        </div>
        <LogHoursDialog />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md mb-lg">
        <Kpi label="Entries" value={String(rows.length)} icon="list_alt" tone="neutral" />
        <Kpi label="Total Hours" value={totalHours.toFixed(1)} icon="schedule" tone="neutral" />
        <Kpi label="My Hours" value={myHours.toFixed(1)} icon="person" tone="neutral" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Time Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Hours</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Note</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No time logged yet. Add your first entry." : "Sign in to log time."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md font-body-sm text-body-sm text-on-surface">{r.workDate}{r.isSelf && <span className="text-on-surface-variant"> · you</span>}</td>
                    <td className="p-md text-right font-body-sm text-body-sm font-semibold text-on-surface">{r.hours.toFixed(1)}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{r.note ?? "—"}</td>
                    <td className="p-md">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_PILL[r.status]}`}>{r.status}</span>
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

function LogHoursDialog() {
  return (
    <CrudDialog
      triggerLabel="Log Hours"
      triggerIcon="more_time"
      title="Log Hours"
      submitLabel="Save Entry"
      action={logTimesheet}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Date</label>
          <input name="work_date" type="date" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Hours *</label>
          <input name="hours" required type="number" min="0" step="0.25" className={fieldCls} placeholder="8" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Note</label>
        <input name="note" type="text" className={fieldCls} placeholder="What did you work on?" />
      </div>
    </CrudDialog>
  );
}

