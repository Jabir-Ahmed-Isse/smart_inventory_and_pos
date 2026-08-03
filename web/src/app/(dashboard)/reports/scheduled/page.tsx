import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";

export const metadata = { title: "Scheduled Reports — Reports" };

const FREQ = [
  { icon: "today", label: "Daily", desc: "Every morning at 8:00 AM" },
  { icon: "date_range", label: "Weekly", desc: "Every Monday" },
  { icon: "calendar_month", label: "Monthly", desc: "1st of each month" },
];

const REPORTS = ["Executive Dashboard", "Sales Report", "Inventory Report", "Financial Report", "Customer Report"];

export default async function ScheduledReportsPage() {
  const org = await getActiveOrg();
  const email = "you@yourbusiness.com";

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Scheduled Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Automate report delivery to your inbox on a recurring schedule.</p>
      </div>

      {/* Setup notice */}
      <div className="mb-lg rounded-xl border border-tertiary-container/40 bg-tertiary-container/10 px-md py-sm flex items-start gap-3">
        <Icon name="info" className="text-tertiary shrink-0 mt-0.5" />
        <p className="font-body-sm text-body-sm text-on-surface">
          <b>Automated email delivery requires setup.</b> Scheduling the job and sending email needs a background scheduler and an email service (e.g. Resend/SendGrid) connected to your workspace. The schedule builder below is ready — connect a delivery service to activate it. In the meantime, generate any report on demand and export it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Schedule builder */}
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">New Schedule</h3>
          <div className="space-y-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Report</label>
              <select disabled className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm text-on-surface font-body-sm text-body-sm disabled:opacity-70">
                {REPORTS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Frequency</label>
              <div className="grid grid-cols-3 gap-sm">
                {FREQ.map((f, i) => (
                  <div key={f.label} className={`rounded-lg border p-3 text-center ${i === 1 ? "border-primary bg-primary/5" : "border-outline-variant"}`}>
                    <Icon name={f.icon} className={i === 1 ? "text-primary" : "text-on-surface-variant"} />
                    <p className="font-label-md text-label-md text-on-surface mt-1">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Deliver to</label>
              <input disabled defaultValue={email} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm text-on-surface font-body-sm text-body-sm disabled:opacity-70" />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Format</label>
              <div className="flex gap-sm">
                {["PDF", "Excel", "CSV"].map((f) => (
                  <span key={f} className="px-3 py-1.5 rounded-lg border border-outline-variant font-label-md text-label-md text-on-surface-variant">{f}</span>
                ))}
              </div>
            </div>
            <button disabled className="w-full py-2.5 rounded-lg bg-primary/40 text-on-primary font-label-md text-label-md cursor-not-allowed flex items-center justify-center gap-2">
              <Icon name="lock" size={16} /> Activate delivery (setup required)
            </button>
          </div>
        </div>

        {/* Generate now + history */}
        <div className="flex flex-col gap-lg">
          <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Generate a report now</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">Open any report and export it immediately — no scheduling needed.</p>
            <div className="grid grid-cols-2 gap-sm">
              <QuickLink href="/reports" icon="dashboard" label="Executive" />
              <QuickLink href="/reports/sales" icon="point_of_sale" label="Sales" />
              <QuickLink href="/reports/inventory" icon="inventory_2" label="Inventory" />
              <QuickLink href="/reports/custom" icon="tune" label="Custom (CSV/PDF)" />
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm flex-1">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Delivery History</h3>
            <div className="flex flex-col items-center justify-center text-center py-lg text-on-surface-variant gap-2">
              <Icon name="mark_email_read" size={32} className="text-outline-variant" />
              <p className="font-body-sm text-body-sm">No scheduled deliveries yet.</p>
              <p className="font-label-md text-label-md">History appears here once delivery is activated.</p>
            </div>
          </div>
        </div>
      </div>

      {!org && <p className="mt-lg text-center text-on-surface-variant">Sign in to configure schedules.</p>}
    </main>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:border-primary hover:bg-primary/5 transition-colors font-body-sm text-body-sm">
      <Icon name={icon} size={18} className="text-primary" /> {label}
    </Link>
  );
}
