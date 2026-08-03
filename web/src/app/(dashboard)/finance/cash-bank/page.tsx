import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, financeSummary } from "@/lib/finance/data";

export const metadata = { title: "Cash & Bank — Inventory Pro" };

export default async function CashBankPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const s = raw ? financeSummary(raw) : null;

  if (!s || !raw) return <div className="p-xl text-center text-on-surface-variant">Sign in to view cash &amp; bank.</div>;

  const deposits = raw.transactions.filter((t) => t.type === "income");
  const withdrawals = raw.transactions.filter((t) => t.type === "expense");
  const cashBalance = s.revenue - s.expenses;
  const movements = raw.transactions.slice(0, 12);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Cash &amp; Bank</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Current balances, deposits and withdrawals.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Cash" value={compactMoney(cashBalance, currency)} icon="account_balance_wallet" tone={cashBalance >= 0 ? "positive" : "negative"} />
        <Kpi label="Deposits" value={compactMoney(s.revenue, currency)} icon="south_west" tone="positive" sub={`${deposits.length} in`} />
        <Kpi label="Withdrawals" value={compactMoney(s.expenses, currency)} icon="north_east" tone="warning" sub={`${withdrawals.length} out`} />
        <Kpi label="Accounts" value="1" icon="account_balance" tone="neutral" sub="cash on hand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Accounts */}
        <div className="lg:col-span-1 flex flex-col gap-md">
          <div className="bg-gradient-to-br from-primary to-primary/70 text-on-primary rounded-xl p-lg shadow-sm relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="flex items-center justify-between mb-lg relative z-10">
              <span className="font-label-md text-label-md uppercase tracking-wider opacity-90">Cash Account</span>
              <Icon name="payments" />
            </div>
            <p className="font-label-md text-label-md opacity-90">Current Balance</p>
            <p className="font-display-lg text-[28px] font-bold tabular-nums">{money(cashBalance, currency)}</p>
            <p className="font-label-md text-label-md opacity-80 mt-sm">Net of all recorded income and expenses.</p>
          </div>

          <div className="bg-surface border border-dashed border-outline-variant rounded-xl p-lg text-center">
            <Icon name="account_balance" size={32} className="text-outline-variant mb-sm" />
            <p className="font-body-md text-body-md text-on-surface font-medium">Connect a bank account</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
              Multi-account banking, transfers and reconciliation activate once bank accounts are configured for your workspace.
            </p>
            <span className="inline-flex items-center gap-1 mt-md px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
              <Icon name="lock" size={14} /> Setup required
            </span>
          </div>
        </div>

        {/* Movements */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Cash Movements</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Date</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Description</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant">Type</th>
                  <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                {movements.length === 0 ? (
                  <tr><td colSpan={4} className="p-xl text-center text-on-surface-variant">No cash movements yet.</td></tr>
                ) : (
                  movements.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-md text-on-surface-variant whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="p-md text-on-surface">{t.description ?? t.category ?? "—"}</td>
                      <td className="p-md">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${t.type === "income" ? "bg-primary-container/20 text-primary" : "bg-error-container/30 text-error"}`}>
                          {t.type === "income" ? "Deposit" : "Withdrawal"}
                        </span>
                      </td>
                      <td className={`p-md text-right font-semibold tabular-nums ${t.type === "income" ? "text-primary" : "text-error"}`}>
                        {t.type === "income" ? "+" : "−"}{money(t.amount, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
