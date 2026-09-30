import { Icon } from "@/components/Icon";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadLedger, balanceSheet, type StatementGroup } from "@/lib/accounting/data";

export const metadata = { title: "Balance Sheet — Inventory Pro" };

export default async function BalanceSheetPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const ledger = await loadLedger(org.orgId);
  if (!ledger.isSetUp) {
    return <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full"><SeedAccountingCard /></main>;
  }
  const bs = balanceSheet(ledger);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Balance Sheet</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          As of {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Assets = Liabilities + Equity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <Section group={bs.assets} currency={currency} accent="text-primary" totalLabel="Total Assets" total={bs.totalAssets} />
        <div className="space-y-lg">
          <Section group={bs.liabilities} currency={currency} accent="text-tertiary" totalLabel="Total Liabilities" total={bs.liabilities.total} />
          <Section group={bs.equity} currency={currency} accent="text-secondary" totalLabel="Total Equity" total={bs.equity.total} />
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm px-md py-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wide">Liabilities + Equity</span>
            <span className="font-headline-lg text-headline-lg text-on-surface tabular-nums">{money(bs.totalLiabilitiesEquity, currency)}</span>
          </div>
        </div>
      </div>

      <div className={`mt-lg inline-flex items-center gap-2 px-md py-2 rounded-lg font-label-md text-label-md ${bs.balanced ? "bg-primary-container/20 text-primary" : "bg-error-container/30 text-error"}`}>
        <Icon name={bs.balanced ? "check_circle" : "error"} size={16} filled />
        {bs.balanced
          ? "Balanced — assets equal liabilities plus equity."
          : `Out of balance by ${money(Math.abs(bs.totalAssets - bs.totalLiabilitiesEquity), currency)}.`}
      </div>
    </main>
  );
}

function Section({ group, currency, accent, totalLabel, total }: { group: StatementGroup; currency: string; accent: string; totalLabel: string; total: number }) {
  return (
    <section className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <div className="px-md py-3 border-b border-outline-variant bg-surface-container-lowest">
        <h2 className={`font-headline-lg text-headline-lg ${accent}`}>{group.title}</h2>
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-outline-variant/60">
          {group.lines.length === 0 ? (
            <tr><td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant text-center">No balances.</td></tr>
          ) : (
            group.lines.map((l, i) => (
              <tr key={`${l.code}-${i}`} className="hover:bg-surface-container-high/40">
                <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface">
                  {l.code !== "—" && <span className="text-on-surface-variant tabular-nums mr-2">{l.code}</span>}
                  {l.name}
                </td>
                <td className="px-md py-2.5 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(l.amount, currency)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-outline bg-surface-container-lowest font-bold">
            <td className="px-md py-3 font-label-md text-label-md text-on-surface uppercase tracking-wide">{totalLabel}</td>
            <td className="px-md py-3 font-body-md text-body-md text-right tabular-nums text-on-surface">{money(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
