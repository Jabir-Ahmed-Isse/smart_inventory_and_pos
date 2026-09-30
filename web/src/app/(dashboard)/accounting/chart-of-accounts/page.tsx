import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NewAccountDialog } from "@/components/accounting/NewAccountDialog";
import { SeedAccountingCard } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { loadLedger, accountBalances } from "@/lib/accounting/data";
import type { AccountType } from "@/lib/supabase/database.types";

export const metadata = { title: "Chart of Accounts — Inventory Pro" };

const TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "income", "expense"];
const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};
const TYPE_TONE: Record<AccountType, string> = {
  asset: "text-primary",
  liability: "text-tertiary",
  equity: "text-secondary",
  income: "text-primary",
  expense: "text-error",
};

export default async function ChartOfAccountsPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const ledger = await loadLedger(org.orgId);
  if (!ledger.isSetUp) {
    return (
      <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
        <SeedAccountingCard />
      </main>
    );
  }

  const bals = accountBalances(ledger);
  const currency = org.currency;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Chart of Accounts</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {bals.length} accounts across assets, liabilities, equity, income and expenses.
          </p>
        </div>
        <NewAccountDialog />
      </div>

      <div className="space-y-lg">
        {TYPE_ORDER.map((type) => {
          const rows = bals.filter((a) => a.type === type);
          if (rows.length === 0) return null;
          const total = rows.reduce((s, a) => s + a.balance, 0);
          return (
            <section key={type} className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-md py-3 border-b border-outline-variant bg-surface-container-lowest">
                <h2 className={`font-headline-lg text-headline-lg ${TYPE_TONE[type]}`}>{TYPE_LABEL[type]}</h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Total: <span className="font-semibold text-on-surface tabular-nums">{money(total, currency)}</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant/60">
                      <th className="px-md py-2 font-medium w-24">Code</th>
                      <th className="px-md py-2 font-medium">Account</th>
                      <th className="px-md py-2 font-medium">Subtype</th>
                      <th className="px-md py-2 font-medium text-right">Balance</th>
                      <th className="px-md py-2 font-medium text-right w-24">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {rows.map((a) => (
                      <tr key={a.id} className="hover:bg-surface-container-high/50">
                        <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface-variant tabular-nums">{a.code}</td>
                        <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface">
                          {a.name}
                          {!a.isActive && <span className="ml-2 text-label-md text-on-surface-variant">(inactive)</span>}
                          {a.isSystem && <Icon name="lock" size={12} className="inline ml-1 text-on-surface-variant/60" />}
                        </td>
                        <td className="px-md py-2.5 font-label-md text-label-md text-on-surface-variant">{a.subtype ?? "—"}</td>
                        <td className="px-md py-2.5 font-body-sm text-body-sm text-on-surface text-right tabular-nums">{money(a.balance, currency)}</td>
                        <td className="px-md py-2.5 text-right">
                          <Link href={`/accounting/general-ledger?account=${a.id}`} className="text-primary hover:underline font-label-md text-label-md">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
