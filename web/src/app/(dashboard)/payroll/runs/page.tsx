import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NewPayRunDialog } from "@/components/payroll/PayrollDialogs";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadPayRuns } from "@/lib/payroll/data";

export const metadata = { title: "Pay Runs — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-tertiary-container/20 text-tertiary",
  approved: "bg-primary-container/20 text-primary",
  paid: "bg-primary-container/30 text-primary",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

export default async function PayRunsPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const runs = await loadPayRuns(org.orgId);
  const currency = org.currency;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const defaultName = `${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} Payroll`;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Pay Runs</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Each run generates payslips for your active employees.</p>
        </div>
        <NewPayRunDialog defaultName={defaultName} periodStart={start} periodEnd={end} />
      </div>

      {runs.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="event_repeat" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No pay runs yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Create one for the current month to get started.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-md py-3 font-medium">Pay Run</th>
                  <th className="px-md py-3 font-medium">Period</th>
                  <th className="px-md py-3 font-medium text-right">Employees</th>
                  <th className="px-md py-3 font-medium text-right">Gross</th>
                  <th className="px-md py-3 font-medium text-right">Net</th>
                  <th className="px-md py-3 font-medium">Status</th>
                  <th className="px-md py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{r.name}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                      {new Date(r.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(r.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r.payslipCount}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(r.totalGross, currency)}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums font-medium text-on-surface">{money(r.totalNet, currency)}</td>
                    <td className="px-md py-3"><span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[r.status]}`}>{r.status}</span></td>
                    <td className="px-md py-3 text-right">
                      <Link href={`/payroll/runs/${r.id}`} className="text-primary hover:underline font-label-md text-label-md">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
