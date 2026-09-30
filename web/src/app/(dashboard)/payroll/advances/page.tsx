import { Icon } from "@/components/Icon";
import { NewAdvanceDialog } from "@/components/payroll/PayrollDialogs";
import { AdvanceActions } from "@/components/payroll/PayrollActions";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadAdvances } from "@/lib/payroll/data";
import { loadEmployees } from "@/lib/hr/data";

export const metadata = { title: "Advances & Loans — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  pending: "bg-tertiary-container/20 text-tertiary",
  approved: "bg-secondary-container/20 text-secondary",
  disbursed: "bg-primary-container/20 text-primary",
  settled: "bg-surface-container-high text-on-surface-variant",
  rejected: "bg-error-container/30 text-error",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

export default async function AdvancesPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [advances, employees] = await Promise.all([loadAdvances(org.orgId), loadEmployees(org.orgId)]);
  const currency = org.currency;
  const empOpts = employees.filter((e) => e.status !== "terminated").map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNumber})` }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Advances &amp; Loans</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Salary advances and loans that auto-deduct from future payslips.</p>
        </div>
        {employees.length > 0 && <NewAdvanceDialog employees={empOpts} />}
      </div>

      {advances.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="account_balance_wallet" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No advances or loans yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-md py-3 font-medium">Employee</th>
                  <th className="px-md py-3 font-medium">Type</th>
                  <th className="px-md py-3 font-medium text-right">Amount</th>
                  <th className="px-md py-3 font-medium">Repayment</th>
                  <th className="px-md py-3 font-medium text-right">Balance</th>
                  <th className="px-md py-3 font-medium">Status</th>
                  <th className="px-md py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {advances.map((a) => {
                  const pct = a.amount > 0 ? Math.round((a.repaid / a.amount) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-surface-container-high/40">
                      <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{a.employeeName}{a.reason ? <span className="block font-label-md text-label-md text-on-surface-variant">{a.reason}</span> : null}</td>
                      <td className="px-md py-3">
                        <span className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant capitalize">
                          <Icon name={a.advanceType === "loan" ? "request_quote" : "bolt"} size={14} /> {a.advanceType}{a.advanceType === "loan" ? ` · ${a.installments}×` : ""}
                        </span>
                      </td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(a.amount, currency)}</td>
                      <td className="px-md py-3 w-40">
                        {a.status === "disbursed" || a.status === "settled" ? (
                          <div>
                            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden mb-1">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-label-md text-label-md text-on-surface-variant">{money(a.repaid, currency)} of {money(a.amount, currency)}{a.installmentAmount > 0 && a.status === "disbursed" ? ` · ${money(a.installmentAmount, currency)}/run` : ""}</span>
                          </div>
                        ) : (
                          <span className="font-label-md text-label-md text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-md py-3 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{a.status === "disbursed" ? money(a.balance, currency) : a.status === "settled" ? money(0, currency) : "—"}</td>
                      <td className="px-md py-3"><span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[a.status]}`}>{a.status}</span></td>
                      <td className="px-md py-3"><AdvanceActions id={a.id} status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
