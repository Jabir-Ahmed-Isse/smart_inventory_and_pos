import { Icon } from "@/components/Icon";
import { NewComponentDialog, AssignComponentDialog } from "@/components/payroll/PayrollDialogs";
import { SeedPayrollButton } from "@/components/payroll/PayrollActions";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadComponents, type SalaryComponent } from "@/lib/payroll/data";
import { loadEmployees } from "@/lib/hr/data";

export const metadata = { title: "Salary Components — Inventory Pro" };

export default async function ComponentsPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [components, employees] = await Promise.all([loadComponents(org.orgId), loadEmployees(org.orgId)]);
  const currency = org.currency;
  const empOpts = employees.filter((e) => e.status !== "terminated").map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNumber})` }));
  const compOpts = components.filter((c) => c.active && !c.appliesToAll).map((c) => ({ id: c.id, label: `${c.name} (${c.componentType})` }));

  const earnings = components.filter((c) => c.componentType === "earning");
  const deductions = components.filter((c) => c.componentType === "deduction");

  const describe = (c: SalaryComponent) =>
    c.calcMethod === "percent_basic" ? `${c.rate}% of basic` : money(c.amount, currency);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Salary Components</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Earnings and deductions applied when payslips are generated.</p>
        </div>
        <div className="flex flex-wrap gap-sm items-center">
          {components.length === 0 && <SeedPayrollButton />}
          {compOpts.length > 0 && employees.length > 0 && <AssignComponentDialog employees={empOpts} components={compOpts} />}
          <NewComponentDialog />
        </div>
      </div>

      {components.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-md">
            <Icon name="tune" size={28} filled />
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Set up payroll</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
            Install standard statutory deductions (PAYE, social security) and the payroll ledger accounts, or add your own components.
          </p>
          <div className="flex items-center justify-center gap-sm">
            <SeedPayrollButton />
            <NewComponentDialog />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <Section title="Earnings" icon="add_circle" tone="text-primary" rows={earnings} describe={describe} currency={currency} />
          <Section title="Deductions" icon="remove_circle" tone="text-error" rows={deductions} describe={describe} currency={currency} />
        </div>
      )}
    </main>
  );
}

function Section({
  title, icon, tone, rows, describe,
}: {
  title: string; icon: string; tone: string;
  rows: SalaryComponent[];
  describe: (c: SalaryComponent) => string;
  currency: string;
}) {
  return (
    <section>
      <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md flex items-center gap-2">
        <Icon name={icon} size={20} className={tone} /> {title}
      </h2>
      {rows.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg text-center shadow-sm font-body-sm text-body-sm text-on-surface-variant">None yet.</div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/60">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-md py-3">
              <div>
                <p className="font-body-sm text-body-sm text-on-surface">
                  {c.name}
                  {!c.active && <span className="ml-2 text-label-md text-on-surface-variant">(inactive)</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.appliesToAll && <span className="font-label-md text-label-md px-1.5 py-0.5 rounded bg-primary-container/20 text-primary">All employees</span>}
                  {c.isStatutory && <span className="font-label-md text-label-md px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">Statutory</span>}
                  {c.code && <span className="font-label-md text-label-md text-on-surface-variant">{c.code}</span>}
                </div>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface tabular-nums">{describe(c)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
