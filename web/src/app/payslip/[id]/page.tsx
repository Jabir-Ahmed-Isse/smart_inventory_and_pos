import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PrintButton } from "@/components/payroll/PrintButton";
import { requireRole } from "@/lib/rbac";
import { money } from "@/lib/data";
import { loadPayslip } from "@/lib/payroll/data";

export const metadata = { title: "Payslip — Inventory Pro" };

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const org = await requireRole(["owner", "admin", "accountant"]);
  const { id } = await params;
  const slip = await loadPayslip(org.orgId, id);
  if (!slip) notFound();
  const currency = org.currency;
  const totalEarnings = slip.earnings.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="no-print border-b border-outline-variant bg-surface sticky top-0 z-10">
        <div className="max-w-[820px] mx-auto px-md py-3 flex items-center justify-between">
          <Link href="/payroll/runs" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-md text-label-md">
            <Icon name="arrow_back" size={16} /> Back to pay runs
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Document */}
      <div className="max-w-[820px] mx-auto p-md md:p-lg">
        <article className="bg-surface print:shadow-none shadow-sm border border-outline-variant print:border-0 rounded-xl print:rounded-none p-lg md:p-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-md border-b border-outline-variant pb-md mb-md">
            <div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface">{org.orgName}</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Payslip · {slip.runName}</p>
            </div>
            <div className="text-right">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Net Pay</p>
              <p className="font-display-lg text-[26px] font-bold text-primary tabular-nums">{money(slip.netPay, currency)}</p>
              <span className={`inline-block mt-1 font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${slip.status === "paid" ? "bg-primary-container/20 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>{slip.status}</span>
            </div>
          </div>

          {/* Employee + period */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md mb-lg">
            <Field label="Employee" value={slip.employeeName} />
            <Field label="Employee No." value={slip.employeeNumber} />
            <Field label="Department" value={slip.department ?? "—"} />
            <Field label="Position" value={slip.position ?? "—"} />
            <Field label="Pay period" value={`${fmtDate(slip.periodStart)} – ${fmtDate(slip.periodEnd)}`} />
            <Field label="Pay date" value={fmtDate(slip.payDate)} />
            <Field label="Bank" value={slip.bankName ?? "—"} />
            <Field label="Mobile money" value={slip.mobileMoney ?? "—"} />
          </div>

          {/* Earnings + deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            <Section title="Earnings" rows={slip.earnings} total={totalEarnings} totalLabel="Gross pay" currency={currency} positive />
            <Section
              title="Deductions"
              rows={[...slip.deductions]}
              total={slip.totalDeductions + slip.advanceRepayment}
              totalLabel="Total deductions"
              currency={currency}
            />
          </div>

          {/* Net */}
          <div className="flex items-center justify-between border-t-2 border-outline pt-md">
            <span className="font-headline-lg text-headline-lg text-on-surface">Net Pay</span>
            <span className="font-display-lg text-[24px] font-bold text-primary tabular-nums">{money(slip.netPay, currency)}</span>
          </div>

          <p className="font-label-md text-label-md text-on-surface-variant mt-lg pt-md border-t border-outline-variant">
            This is a computer-generated payslip. Gross {money(slip.gross, currency)} − deductions {money(slip.totalDeductions + slip.advanceRepayment, currency)} = net {money(slip.netPay, currency)}.
          </p>
        </article>
      </div>

      <style>{`@media print { .no-print { display: none !important; } @page { margin: 14mm; } }`}</style>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</p>
      <p className="font-body-sm text-body-sm text-on-surface mt-0.5">{value}</p>
    </div>
  );
}

function Section({ title, rows, total, totalLabel, currency, positive }: {
  title: string; rows: { label: string; amount: number }[]; total: number; totalLabel: string; currency: string; positive?: boolean;
}) {
  return (
    <div className="border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-md py-2 bg-surface-container-lowest border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{title}</div>
      <table className="w-full">
        <tbody className="divide-y divide-outline-variant/60">
          {rows.length === 0 ? (
            <tr><td className="px-md py-2 font-body-sm text-body-sm text-on-surface-variant text-center">None</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i}>
                <td className="px-md py-1.5 font-body-sm text-body-sm text-on-surface">{r.label}</td>
                <td className={`px-md py-1.5 font-body-sm text-body-sm text-right tabular-nums ${positive ? "text-on-surface" : "text-error"}`}>{positive ? "" : "−"}{money(r.amount, currency)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-outline bg-surface-container-lowest font-semibold">
            <td className="px-md py-2 font-label-md text-label-md text-on-surface">{totalLabel}</td>
            <td className="px-md py-2 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
