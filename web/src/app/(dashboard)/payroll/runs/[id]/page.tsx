import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { RunActions, AdjustmentRemoveButton } from "@/components/payroll/PayrollActions";
import { AddAdjustmentDialog } from "@/components/payroll/PayrollDialogs";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadPayRun } from "@/lib/payroll/data";

export const metadata = { title: "Pay Run — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-tertiary-container/20 text-tertiary",
  approved: "bg-primary-container/20 text-primary",
  paid: "bg-primary-container/30 text-primary",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

export default async function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const { id } = await params;
  const data = await loadPayRun(org.orgId, id);
  if (!data) notFound();
  const { run, payslips } = data;
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <Link href="/payroll/runs" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-md text-label-md mb-md">
        <Icon name="arrow_back" size={16} /> Pay Runs
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-md mb-lg">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-xl text-headline-xl text-on-surface">{run.name}</h1>
            <span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[run.status]}`}>{run.status}</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {new Date(run.periodStart).toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {new Date(run.periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Pay date {new Date(run.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
        <RunActions id={run.id} status={run.status} />
      </div>

      {run.status === "draft" && (
        <div className="mb-lg rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-md py-2.5 flex items-start gap-2 font-body-sm text-body-sm text-on-surface">
          <Icon name="info" size={18} className="text-tertiary shrink-0 mt-0.5" />
          <span><strong>Generate payslips</strong> rebuilds this run from current salaries, components and <strong>disbursed</strong> advances. Disburse advances first, then generate — an advance is only deducted once it has been disbursed.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-md mb-lg">
        <Tile label="Gross" value={money(run.totalGross, currency)} />
        <Tile label="Deductions" value={money(run.totalDeductions, currency)} />
        <Tile label="Net Pay" value={money(run.totalNet, currency)} strong />
      </div>

      {payslips.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="calculate" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No payslips yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Use “Generate payslips” to compute pay for all active employees.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {payslips.map((p) => (
            <details key={p.id} className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden group">
              <summary className="flex items-center justify-between gap-md px-md py-3 cursor-pointer list-none hover:bg-surface-container-high/40">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon name="chevron_right" size={18} className="text-on-surface-variant transition-transform group-open:rotate-90" />
                  <div className="w-9 h-9 rounded-full bg-primary-container/30 text-primary flex items-center justify-center font-label-md text-label-md shrink-0">
                    {p.employeeName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface truncate">{p.employeeName}</span>
                </div>
                <div className="flex items-center gap-lg shrink-0">
                  <span className="hidden sm:block font-label-md text-label-md text-on-surface-variant">Gross {money(p.gross, currency)}</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">{money(p.netPay, currency)}</span>
                </div>
              </summary>
              <div className="border-t border-outline-variant/60 px-md py-3">
                <table className="w-full">
                  <tbody>
                    {p.items.map((it, i) => (
                      <tr key={i}>
                        <td className="py-1 font-body-sm text-body-sm text-on-surface">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${it.itemType === "earning" ? "bg-primary" : "bg-error"}`} />
                          {it.label}
                        </td>
                        <td className={`py-1 font-body-sm text-body-sm text-right tabular-nums ${it.itemType === "earning" ? "text-on-surface" : "text-error"}`}>
                          {it.itemType === "earning" ? "" : "−"}{money(it.amount, currency)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-outline-variant/60">
                      <td className="pt-2 font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Net Pay</td>
                      <td className="pt-2 font-body-sm text-body-sm text-right tabular-nums font-semibold text-on-surface">{money(p.netPay, currency)}</td>
                    </tr>
                  </tbody>
                </table>

                {run.status === "draft" && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">One-off adjustments</span>
                      <AddAdjustmentDialog runId={run.id} employeeId={p.employeeId} employeeName={p.employeeName} />
                    </div>
                    {p.adjustments.length === 0 ? (
                      <p className="font-label-md text-label-md text-on-surface-variant">None — add a bonus, overtime or a one-off deduction for this run only.</p>
                    ) : (
                      <ul className="space-y-1">
                        {p.adjustments.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-2 font-body-sm text-body-sm">
                            <span className="flex items-center gap-2 text-on-surface">
                              <span className={`inline-block w-2 h-2 rounded-full ${a.type === "earning" ? "bg-primary" : "bg-error"}`} />
                              {a.label}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={`tabular-nums ${a.type === "earning" ? "text-on-surface" : "text-error"}`}>{a.type === "earning" ? "+" : "−"}{money(a.amount, currency)}</span>
                              <AdjustmentRemoveButton id={a.id} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-outline-variant/60 flex justify-end">
                  <Link href={`/payslip/${p.id}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
                    <Icon name="print" size={15} /> Payslip PDF
                  </Link>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}

function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</p>
      <p className={`font-display-lg text-[24px] leading-none font-bold tracking-tight mt-2 ${strong ? "text-primary" : "text-on-surface"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}
