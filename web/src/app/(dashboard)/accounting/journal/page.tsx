import { Icon } from "@/components/Icon";
import { NewJournalEntryDialog } from "@/components/accounting/NewJournalEntryDialog";
import { EntryActions } from "@/components/accounting/EntryActions";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadAccounts, loadJournal } from "@/lib/accounting/data";

export const metadata = { title: "Journal — Inventory Pro" };

const STATUS_TONE: Record<string, string> = {
  posted: "bg-primary-container/20 text-primary",
  draft: "bg-tertiary-container/20 text-tertiary",
  void: "bg-surface-container-high text-on-surface-variant line-through",
};

export default async function JournalPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [accounts, entries] = await Promise.all([loadAccounts(org.orgId), loadJournal(org.orgId)]);
  if (accounts.length === 0) {
    return (
      <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
        <SeedAccountingCard />
      </main>
    );
  }
  const currency = org.currency;
  const accountOptions = accounts.filter((a) => a.isActive).map((a) => ({ id: a.id, code: a.code, name: a.name }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Journal</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Every double-entry transaction. Manual entries plus automatic postings from sales and purchases.
          </p>
        </div>
        <NewJournalEntryDialog accounts={accountOptions} />
      </div>

      {entries.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="menu_book" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No journal entries yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Record a manual entry, or sync operations from the Accounting overview.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {entries.map((e) => (
            <div key={e.id} className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-md px-md py-3 border-b border-outline-variant bg-surface-container-lowest">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">{e.entryNumber}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">{new Date(e.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant capitalize px-2 py-0.5 rounded-full bg-surface-container-high">{e.source}</span>
                  {e.memo && <span className="font-body-sm text-body-sm text-on-surface-variant truncate">· {e.memo}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-label-md text-label-md px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[e.status]}`}>{e.status}</span>
                  {e.source === "manual" && <EntryActions id={e.id} status={e.status} />}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-outline-variant/40">
                    {e.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-md py-2 font-body-sm text-body-sm text-on-surface w-1/2">
                          <span className="text-on-surface-variant tabular-nums mr-2">{l.accountCode}</span>
                          {l.accountName}
                          {l.description && <span className="text-on-surface-variant"> · {l.description}</span>}
                        </td>
                        <td className="px-md py-2 font-body-sm text-body-sm text-right tabular-nums text-on-surface w-1/4">{l.debit > 0 ? money(l.debit, currency) : ""}</td>
                        <td className="px-md py-2 font-body-sm text-body-sm text-right tabular-nums text-on-surface w-1/4">{l.credit > 0 ? money(l.credit, currency) : ""}</td>
                      </tr>
                    ))}
                    <tr className="bg-surface-container-lowest font-semibold">
                      <td className="px-md py-2 font-label-md text-label-md text-on-surface-variant text-right">Totals</td>
                      <td className="px-md py-2 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(e.totalDebit, currency)}</td>
                      <td className="px-md py-2 font-body-sm text-body-sm text-right tabular-nums text-on-surface">{money(e.totalCredit, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
