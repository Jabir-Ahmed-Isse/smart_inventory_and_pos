import { Icon } from "@/components/Icon";
import { AccountPicker } from "@/components/accounting/AccountPicker";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadLedger, generalLedger } from "@/lib/accounting/data";

export const metadata = { title: "General Ledger — Inventory Pro" };

export default async function GeneralLedgerPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const ledger = await loadLedger(org.orgId);
  if (!ledger.isSetUp) {
    return <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full"><SeedAccountingCard /></main>;
  }

  const { account: accountId } = await searchParams;
  const currency = org.currency;
  const options = ledger.accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }));
  const gl = accountId ? generalLedger(ledger, accountId) : null;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">General Ledger</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Drill into every posting for a single account, with a running balance.</p>
      </div>

      <div className="mb-lg">
        <AccountPicker accounts={options} selected={accountId ?? ""} />
      </div>

      {!gl || !gl.account ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="list_alt" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">Choose an account above to view its ledger.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-md py-3 border-b border-outline-variant bg-surface-container-lowest">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              <span className="text-on-surface-variant tabular-nums mr-2">{gl.account.code}</span>
              {gl.account.name}
            </h2>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Closing balance: <span className="font-semibold text-on-surface tabular-nums">{money(gl.closing, currency)}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant/60">
                  <th className="px-md py-2 font-medium">Date</th>
                  <th className="px-md py-2 font-medium">Entry</th>
                  <th className="px-md py-2 font-medium">Description</th>
                  <th className="px-md py-2 font-medium text-right">Debit</th>
                  <th className="px-md py-2 font-medium text-right">Credit</th>
                  <th className="px-md py-2 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {gl.rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-md py-6 text-center font-body-sm text-body-sm text-on-surface-variant">No postings for this account yet.</td></tr>
                ) : (
                  gl.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-container-high/40">
                      <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">{new Date(r.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface-variant tabular-nums">{r.entryNumber}</td>
                      <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface">{r.description ?? r.memo ?? "—"}</td>
                      <td className="px-md py-2.5 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r.debit > 0 ? money(r.debit, currency) : ""}</td>
                      <td className="px-md py-2.5 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{r.credit > 0 ? money(r.credit, currency) : ""}</td>
                      <td className="px-md py-2.5 font-body-sm text-body-sm text-right tabular-nums font-medium text-on-surface">{money(r.running, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
