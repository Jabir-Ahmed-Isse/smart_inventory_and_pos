import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { getActiveBranchId } from "@/lib/branches/context";
import { money, compactMoney } from "@/lib/data";
import { loadFinance } from "@/lib/finance/data";
import { getAccountsWithBalance } from "@/lib/accounts/data";
import { AccountsPanel } from "./AccountsPanel";
import { AssignAccount } from "./AssignAccount";

export const metadata = { title: "Cash & Bank — Inventory Pro" };

const CAN_MANAGE = ["owner", "admin", "manager", "accountant"];

export default async function CashBankPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view cash &amp; bank.</div>;

  const [accounts, raw] = await Promise.all([getAccountsWithBalance(org.orgId), loadFinance(org.orgId, await getActiveBranchId())]);
  const canManage = CAN_MANAGE.includes(org.role);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalIn = accounts.reduce((s, a) => s + a.inflow, 0);
  const totalOut = accounts.reduce((s, a) => s + a.outflow, 0);
  const activeCount = accounts.filter((a) => a.isActive).length;
  const movements = raw ? raw.transactions.slice(0, 12) : [];
  // Lite list of the active accounts for the inline "assign to account" control.
  const accountsLite = accounts.filter((a) => a.isActive).map((a) => ({ id: a.id, name: a.name, kind: a.kind }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Cash &amp; Bank</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Your bank and mobile-money accounts, with a live balance for each.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Balance" value={compactMoney(totalBalance, currency)} icon="account_balance_wallet" tone={totalBalance >= 0 ? "positive" : "negative"} />
        <Kpi label="Accounts" value={String(accounts.length)} icon="account_balance" tone="neutral" sub={`${activeCount} active`} />
        <Kpi label="Money In" value={compactMoney(totalIn, currency)} icon="south_west" tone="positive" />
        <Kpi label="Money Out" value={compactMoney(totalOut, currency)} icon="north_east" tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Accounts */}
        <div className="lg:col-span-2">
          <AccountsPanel accounts={accounts} currency={currency} canManage={canManage} />
        </div>

        {/* Movements */}
        <div className="lg:col-span-1 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Movements</h3>
          </div>
          <div className="divide-y divide-outline-variant/60">
            {movements.length === 0 ? (
              <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No movements yet.</p>
            ) : (
              movements.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-sm p-md">
                  <div className="min-w-0">
                    <p className="font-body-sm text-body-sm text-on-surface truncate">{t.description ?? t.category ?? "—"}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    {canManage && !t.accountId && <AssignAccount txId={t.id} accounts={accountsLite} />}
                  </div>
                  <span className={`font-body-sm text-body-sm font-semibold tabular-nums whitespace-nowrap ${t.type === "income" ? "text-primary" : "text-error"}`}>
                    {t.type === "income" ? "+" : "−"}{money(t.amount, currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
