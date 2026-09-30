import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { compactMoney } from "@/lib/data";
import { loadPayRuns, loadAdvances, loadComponents, payrollOverview } from "@/lib/payroll/data";

export const metadata = { title: "Payroll — Inventory Pro" };

export default async function PayrollOverviewPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [runs, advances, components] = await Promise.all([
    loadPayRuns(org.orgId),
    loadAdvances(org.orgId),
    loadComponents(org.orgId),
  ]);
  const o = payrollOverview(runs, advances, components);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Payroll</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Pay runs, payslips, advances and loans — posted to your ledger.</p>
        </div>
        <Link href="/payroll/runs" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
          <Icon name="event_repeat" size={18} /> Go to Pay Runs
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-md mb-lg">
        <Kpi label="Last Run Net" value={compactMoney(o.lastRunNet, currency)} icon="payments" tone="neutral" sub={o.lastRunName ?? "no runs yet"} />
        <Kpi label="Pay Runs" value={String(o.runCount)} icon="event_repeat" tone="neutral" />
        <Kpi label="Pending Advances" value={String(o.pendingAdvances)} icon="pending_actions" tone={o.pendingAdvances > 0 ? "warning" : "neutral"} />
        <Kpi label="Outstanding Loans" value={compactMoney(o.outstandingLoans, currency)} icon="account_balance_wallet" tone={o.outstandingLoans > 0 ? "warning" : "neutral"} sub="to be recovered" />
        <Kpi label="Active Components" value={String(o.activeComponents)} icon="tune" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <Card href="/payroll/runs" icon="event_repeat" title="Run Payroll" desc="Create a pay run, generate payslips, approve and pay — salary cost posts to the ledger automatically." />
        <Card href="/payroll/advances" icon="account_balance_wallet" title="Advances & Loans" desc="Approve salary advances and multi-installment loans that auto-deduct from future payslips." />
        <Card href="/payroll/components" icon="tune" title="Salary Components" desc="Allowances and deductions (transport, housing, tax, pension) applied across payroll." />
      </div>
    </main>
  );
}

function Card({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm hover:bg-surface-container-high/40 transition-colors group">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-md group-hover:scale-105 transition-transform">
        <Icon name={icon} size={22} filled />
      </div>
      <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">{title}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{desc}</p>
    </Link>
  );
}
