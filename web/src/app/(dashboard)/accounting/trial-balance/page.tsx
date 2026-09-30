import { Icon } from "@/components/Icon";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadLedger, trialBalance } from "@/lib/accounting/data";

export const metadata = { title: "Trial Balance — Inventory Pro" };

export default async function TrialBalancePage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const ledger = await loadLedger(org.orgId);
  if (!ledger.isSetUp) {
    return <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full"><SeedAccountingCard /></main>;
  }
  const tb = trialBalance(ledger);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Trial Balance</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          As of {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Total debits must equal total credits.
        </p>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-md py-3 font-medium w-24">Code</th>
                <th className="px-md py-3 font-medium">Account</th>
                <th className="px-md py-3 font-medium text-right">Debit</th>
                <th className="px-md py-3 font-medium text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {tb.rows.map((r) => (
                <tr key={r.code} className="hover:bg-surface-container-high/40">
                  <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface-variant tabular-nums">{r.code}</td>
                  <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface">{r.name}</td>
                  <td className="px-md py-2.5 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r.debit > 0 ? money(r.debit, currency) : ""}</td>
                  <td className="px-md py-2.5 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r.credit > 0 ? money(r.credit, currency) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-outline bg-surface-container-lowest font-bold">
                <td className="px-md py-3" />
                <td className="px-md py-3 font-label-md text-label-md text-on-surface uppercase tracking-wide">Total</td>
                <td className="px-md py-3 font-body-md text-body-md text-right tabular-nums text-on-surface">{money(tb.totalDebit, currency)}</td>
                <td className="px-md py-3 font-body-md text-body-md text-right tabular-nums text-on-surface">{money(tb.totalCredit, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={`mt-md inline-flex items-center gap-2 px-md py-2 rounded-lg font-label-md text-label-md ${tb.balanced ? "bg-primary-container/20 text-primary" : "bg-error-container/30 text-error"}`}>
        <Icon name={tb.balanced ? "check_circle" : "error"} size={16} filled />
        {tb.balanced ? "In balance — debits equal credits." : `Out of balance by ${money(Math.abs(tb.totalDebit - tb.totalCredit), currency)}.`}
      </div>
    </main>
  );
}
