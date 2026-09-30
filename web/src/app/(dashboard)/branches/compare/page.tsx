import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/rbac";
import { getActiveOrg } from "@/lib/org";
import { getBranchComparison, type BranchStat } from "@/lib/branches/comparison";
import { RevenueExpenseBars } from "@/components/finance/Charts";

export const metadata = { title: "Branch Comparison — Inventory Pro" };

export default async function BranchComparePage() {
  const org = await requireRole(["owner", "admin", "manager", "accountant"]);
  const stats = await getBranchComparison(org);
  const currency = org.currency || "USD";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const totals = stats.reduce(
    (a, s) => ({
      sales: a.sales + s.sales, orders: a.orders + s.orders, collected: a.collected + s.collected,
      unpaid: a.unpaid + s.unpaid, expenses: a.expenses + s.expenses, netProfit: a.netProfit + s.netProfit,
      inventoryValue: a.inventoryValue + s.inventoryValue, lowStock: a.lowStock + s.lowStock,
    }),
    { sales: 0, orders: 0, collected: 0, unpaid: 0, expenses: 0, netProfit: 0, inventoryValue: 0, lowStock: 0 },
  );

  const best = stats.length ? stats[0] : null; // sorted by sales desc
  const worst = stats.length > 1 ? stats[stats.length - 1] : null;
  const share = (n: number) => (totals.sales > 0 ? Math.round((n / totals.sales) * 100) : 0);

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Branch Comparison</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Side-by-side performance across your branches. Numbers are computed from live data.
        </p>
      </div>

      {stats.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-xl text-center">
          <div className="w-14 h-14 rounded-full bg-primary-container/30 text-primary flex items-center justify-center mx-auto mb-md">
            <Icon name="leaderboard" size={28} />
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">No branches to compare</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Create branches under Administration → Branches to see them compared here.</p>
        </div>
      ) : (
        <>
          {/* Company totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
            <Kpi label="Total sales" value={money(totals.sales)} sub={`${totals.orders} orders`} icon="payments" />
            <Kpi label="Collected" value={money(totals.collected)} sub={`${money(totals.unpaid)} unpaid`} icon="account_balance_wallet" />
            <Kpi label="Net profit" value={money(totals.netProfit)} sub={`${money(totals.expenses)} expenses`} icon="trending_up" />
            <Kpi label="Inventory value" value={money(totals.inventoryValue)} sub={`${totals.lowStock} low-stock`} icon="inventory_2" />
          </div>

          {/* Best / worst */}
          {best && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-lg">
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-lg flex items-center gap-md">
                <span className="w-11 h-11 rounded-lg bg-primary-container/40 text-primary flex items-center justify-center shrink-0"><Icon name="emoji_events" /></span>
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide text-[11px]">Top branch</div>
                  <div className="font-headline-lg text-headline-lg text-on-surface">{best.name}</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">{money(best.sales)} · {share(best.sales)}% of company sales</div>
                </div>
              </div>
              {worst && (
                <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-lg flex items-center gap-md">
                  <span className="w-11 h-11 rounded-lg bg-tertiary-container/40 text-tertiary flex items-center justify-center shrink-0"><Icon name="trending_down" /></span>
                  <div>
                    <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide text-[11px]">Needs attention</div>
                    <div className="font-headline-lg text-headline-lg text-on-surface">{worst.name}</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">{money(worst.sales)} · {share(worst.sales)}% of company sales</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sales vs expenses chart */}
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-lg mb-lg">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Sales vs expenses by branch</h3>
            <div className="h-72">
              <RevenueExpenseBars
                labels={stats.map((s) => s.name)}
                income={stats.map((s) => s.sales)}
                expense={stats.map((s) => s.expenses)}
              />
            </div>
          </div>

          {/* Detailed table */}
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Per-branch detail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[880px] tabular-nums">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-md font-label-md text-label-md text-on-surface-variant">Branch</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Sales</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Orders</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Collected</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Unpaid</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Expenses</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Net profit</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Inv. value</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Low</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                  {stats.map((s) => (
                    <tr key={s.branchId} className="hover:bg-surface-container-high transition-colors">
                      <td className="p-md">
                        <div className="font-label-md text-label-md text-on-surface font-semibold">{s.name}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant text-xs">{s.code} · {share(s.sales)}% of sales</div>
                      </td>
                      <td className="p-md text-right font-medium text-on-surface">{money(s.sales)}</td>
                      <td className="p-md text-right text-on-surface-variant">{s.orders}</td>
                      <td className="p-md text-right text-on-surface-variant">{money(s.collected)}</td>
                      <td className={`p-md text-right ${s.unpaid > 0 ? "text-error" : "text-on-surface-variant"}`}>{money(s.unpaid)}</td>
                      <td className="p-md text-right text-on-surface-variant">{money(s.expenses)}</td>
                      <td className={`p-md text-right font-medium ${s.netProfit >= 0 ? "text-primary" : "text-error"}`}>{money(s.netProfit)}</td>
                      <td className="p-md text-right text-on-surface-variant">{money(s.inventoryValue)}</td>
                      <td className={`p-md text-right ${s.lowStock > 0 ? "text-tertiary font-medium" : "text-on-surface-variant"}`}>{s.lowStock}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-outline-variant bg-surface-container-low font-semibold text-on-surface">
                    <td className="p-md">All branches</td>
                    <td className="p-md text-right">{money(totals.sales)}</td>
                    <td className="p-md text-right">{totals.orders}</td>
                    <td className="p-md text-right">{money(totals.collected)}</td>
                    <td className="p-md text-right">{money(totals.unpaid)}</td>
                    <td className="p-md text-right">{money(totals.expenses)}</td>
                    <td className="p-md text-right">{money(totals.netProfit)}</td>
                    <td className="p-md text-right">{money(totals.inventoryValue)}</td>
                    <td className="p-md text-right">{totals.lowStock}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-lg">
      <div className="flex items-center justify-between mb-xs">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide text-[11px]">{label}</span>
        <Icon name={icon} size={18} className="text-primary" />
      </div>
      <div className="font-headline-lg text-headline-lg text-on-surface tabular-nums">{value}</div>
      <div className="font-body-sm text-body-sm text-on-surface-variant">{sub}</div>
    </div>
  );
}
