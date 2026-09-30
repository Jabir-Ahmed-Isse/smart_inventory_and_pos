import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { InventoryDonut } from "@/components/charts/InventoryDonut";
import { getActiveOrg, orgHasRole } from "@/lib/org";
import { getBranchContext } from "@/lib/branches/context";
import {
  getDashboardMetrics,
  getSalesInRange,
  getDashboardCharts,
  money,
  compactMoney,
  type ChartData,
} from "@/lib/data";
import { getErpSnapshot } from "@/lib/dashboard/erp";
import { PeriodSelector, type PeriodKey } from "./PeriodSelector";
import { StaffDashboard } from "./StaffDashboard";

export const metadata = { title: "Executive Dashboard — Inventory Pro" };

/** Resolves the selected period into a concrete date range + display labels. */
function resolveRange(period: PeriodKey, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (period === "custom" && from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    return { startISO: start.toISOString(), endISO: end.toISOString(), kpiLabel: "Sales", rangeLabel: `${fmt(start)} – ${fmt(end)}`, unit: "orders" };
  }
  if (period === "7d") {
    const start = startOfDay(new Date(now.getTime() - 6 * 86400000));
    return { startISO: start.toISOString(), endISO: undefined, kpiLabel: "Sales · Last 7 days", rangeLabel: "the last 7 days", unit: "orders" };
  }
  if (period === "30d") {
    const start = startOfDay(new Date(now.getTime() - 29 * 86400000));
    return { startISO: start.toISOString(), endISO: undefined, kpiLabel: "Sales · Last 30 days", rangeLabel: "the last 30 days", unit: "orders" };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startISO: start.toISOString(), endISO: undefined, kpiLabel: "Sales · This month", rangeLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }), unit: "orders" };
  }
  // today (default)
  return { startISO: startOfDay(now).toISOString(), endISO: undefined, kpiLabel: "Today's Sales", rangeLabel: fmt(now), unit: "orders" };
}

const EMPTY_CHARTS: ChartData = {
  revenue: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [0, 0, 0, 0, 0, 0, 0] },
  inventory: [],
  totalUnits: 0,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const period: PeriodKey = (["today", "7d", "30d", "month", "custom"].includes(sp.period ?? "")
    ? sp.period
    : "today") as PeriodKey;
  const range = resolveRange(period, sp.from, sp.to);

  const org = await getActiveOrg();

  // Active branch context: when a specific branch is selected (or the user is
  // locked to one), figures narrow to that branch; null = All Branches.
  const branchId = org ? (await getBranchContext(org)).activeBranchId : null;

  // Operational users (staff, cashier) get a limited dashboard with NO financial
  // figures — only quick actions + low-stock awareness. Management (owner/admin/
  // manager/accountant, incl. via extra roles) gets the full executive view.
  const isManagement = orgHasRole(org, ["owner", "admin", "manager", "accountant"]);
  if (org && !isManagement) {
    const m = await getDashboardMetrics(org.orgId, branchId);
    return <StaffDashboard orgName={org.orgName} metrics={m} canSettle={orgHasRole(org, ["cashier"])} />;
  }

  // Finance + people figures are management-only (cash position, payroll cost).
  const canSeeErp = isManagement;

  // Run every dashboard query in parallel instead of one-after-another — 4
  // sequential round-trips become one batch, so the page renders far sooner.
  const [metrics, todaySales, charts, erp] = org
    ? await Promise.all([
        getDashboardMetrics(org.orgId, branchId),
        getSalesInRange(org.orgId, range.startISO, range.endISO, branchId),
        getDashboardCharts(org.orgId, branchId),
        canSeeErp ? getErpSnapshot(org.orgId) : Promise.resolve(null),
      ])
    : [
        { productCount: 0, customerCount: 0, lowStockCount: 0, inventoryValue: 0, netProfit: 0, lowStockItems: [], topProducts: [] },
        { total: 0, count: 0 },
        EMPTY_CHARTS,
        null,
      ];
  const currency = org?.currency ?? "USD";

  return (
    <main className="flex-1 p-md md:p-gutter max-w-container-max mx-auto w-full">
      {/* Page header */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-background">
            Executive Overview
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {org ? `${org.orgName} · ` : ""}Metrics for {range.rangeLabel}
          </p>
        </div>
        <div className="hidden sm:flex gap-sm">
          <PeriodSelector period={period} from={sp.from} to={sp.to} />
          <button className="flex items-center gap-sm px-md py-sm bg-primary text-on-primary rounded-md font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm">
            <Icon name="download" size={16} />
            Export
          </button>
        </div>
      </div>

      {/* KPI grid — live */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <KpiCard
          label={range.kpiLabel}
          icon="point_of_sale"
          iconClass="text-primary"
          value={compactMoney(todaySales.total, currency)}
          delta={`${todaySales.count} ${todaySales.count === 1 ? "order" : "orders"}`}
          deltaClass="text-on-surface-variant"
          deltaIcon="receipt_long"
        />
        <KpiCard
          label="Active Customers"
          icon="groups"
          iconClass="text-tertiary"
          value={metrics.customerCount.toLocaleString()}
          delta="In your workspace"
          deltaClass="text-on-surface-variant"
          deltaIcon="person"
        />
        <KpiCard
          label="Low Stock"
          icon="warning"
          iconClass="text-error"
          value={metrics.lowStockCount.toLocaleString()}
          delta={metrics.lowStockCount > 0 ? "Need reorder soon" : "All stock healthy"}
          deltaClass={metrics.lowStockCount > 0 ? "text-error" : "text-primary"}
          deltaIcon={metrics.lowStockCount > 0 ? "trending_down" : "check_circle"}
        />
        <KpiCard
          label="Inventory Value"
          icon="monitoring"
          iconClass="text-primary-container"
          value={compactMoney(metrics.inventoryValue, currency)}
          delta="On hand at retail"
          deltaClass="text-on-surface-variant"
          deltaIcon="payments"
        />
      </div>

      {/* Finance & People — ledger + HR, management only */}
      {erp && (
        <section className="mb-lg">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-headline-lg text-headline-lg text-on-background flex items-center gap-sm">
              <Icon name="account_balance" className="text-primary" /> Finance &amp; People
            </h3>
            <Link href="/accounting" className="text-on-surface-variant text-label-md font-label-md hover:text-primary flex items-center">
              Accounting <Icon name="chevron_right" size={16} />
            </Link>
          </div>
          {erp.accountingSetUp ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-md">
              <ErpKpi href="/accounting/profit-loss" label="Net Income" icon="account_balance_wallet" value={compactMoney(erp.netIncome, currency)} tone={erp.netIncome >= 0 ? "pos" : "neg"} />
              <ErpKpi href="/accounting/balance-sheet" label="Cash & Bank" icon="account_balance" value={compactMoney(erp.cash, currency)} />
              <ErpKpi href="/finance/receivables" label="Receivables" icon="call_received" value={compactMoney(erp.receivables, currency)} tone={erp.receivables > 0 ? "warn" : undefined} />
              <ErpKpi href="/finance/payables" label="Payables" icon="call_made" value={compactMoney(erp.payables, currency)} tone={erp.payables > 0 ? "neg" : undefined} />
              <ErpKpi href="/hr" label="Headcount" icon="groups" value={erp.headcount.toLocaleString()} />
              <ErpKpi href="/payroll" label="Monthly Payroll" icon="payments" value={compactMoney(erp.monthlyPayroll, currency)} />
            </div>
          ) : (
            <Link href="/accounting" className="glass-card rounded-xl p-md flex items-center gap-md hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name="account_balance" filled />
              </div>
              <div className="flex-1">
                <p className="font-body-md text-body-md text-on-background font-semibold">Set up your accounting ledger</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Install the Chart of Accounts to see cash, receivables, payables and net income here.</p>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </Link>
          )}
        </section>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md mb-lg">
        <div className="glass-card rounded-xl p-md lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-headline-lg text-headline-lg text-on-background">
              Revenue Trend
            </h3>
            <div className="flex gap-sm">
              <span className="font-label-md text-label-md px-sm py-xs bg-surface-container-low rounded-md text-on-surface-variant cursor-pointer hover:bg-surface-container-high">1W</span>
              <span className="font-label-md text-label-md px-sm py-xs bg-primary text-on-primary rounded-md cursor-pointer shadow-sm">1M</span>
              <span className="font-label-md text-label-md px-sm py-xs bg-surface-container-low rounded-md text-on-surface-variant cursor-pointer hover:bg-surface-container-high">1Y</span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[300px] relative">
            <RevenueChart labels={charts.revenue.labels} values={charts.revenue.values} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-md flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-headline-lg text-headline-lg text-on-background">
              Inventory Distribution
            </h3>
            <button className="text-on-surface-variant">
              <Icon name="more_vert" />
            </button>
          </div>
          <div className="flex-1 w-full min-h-[250px] relative flex justify-center items-center">
            {charts.inventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-on-surface-variant gap-xs py-lg">
                <Icon name="donut_large" size={40} className="text-outline-variant" />
                <span className="font-body-sm text-body-sm">No stock to chart yet.</span>
              </div>
            ) : (
              <>
                <InventoryDonut
                  labels={charts.inventory.map((s) => s.label)}
                  values={charts.inventory.map((s) => s.units)}
                  colors={charts.inventory.map((s) => s.color)}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                  <span className="font-display-lg text-display-lg text-on-background text-gradient">
                    {compactUnits(charts.totalUnits)}
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    Total Units
                  </span>
                </div>
              </>
            )}
          </div>
          {charts.inventory.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-sm font-label-md text-label-md">
              {charts.inventory.map((s) => (
                <LegendDot key={s.label} color={s.color} label={s.label} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lower bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Low stock alerts — live */}
        <div className="glass-card rounded-xl p-md flex flex-col">
          <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant">
            <h3 className="font-headline-lg text-headline-lg text-on-background flex items-center gap-sm">
              <Icon name="warning" className="text-error" />
              Low Stock Alerts
            </h3>
            <span className="bg-error-container text-on-error-container px-sm py-xs rounded-full font-label-md text-label-md">
              {metrics.lowStockCount} Critical
            </span>
          </div>
          <ul className="space-y-sm flex-1">
            {metrics.lowStockItems.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-lg text-on-surface-variant gap-xs">
                <Icon name="check_circle" size={32} className="text-primary" />
                <span className="font-body-sm text-body-sm">All stock at healthy levels.</span>
              </li>
            ) : (
              metrics.lowStockItems.map((p) => (
                <LowStockRow
                  key={p.id}
                  name={p.name}
                  sku={`SKU: ${p.sku}`}
                  left={`${p.qty} left`}
                  leftClass={p.status === "out" ? "text-error" : "text-tertiary-container"}
                />
              ))
            )}
          </ul>
          <Link
            href="/products"
            className="w-full mt-md py-sm border border-outline-variant rounded-md font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors text-center"
          >
            View All Inventory
          </Link>
        </div>

        {/* Top products — live */}
        <div className="glass-card rounded-xl p-md lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant">
            <h3 className="font-headline-lg text-headline-lg text-on-background flex items-center gap-sm">
              <Icon name="emoji_events" className="text-primary" />
              Top Products by Stock Value
            </h3>
            <Link
              href="/products"
              className="text-on-surface-variant text-label-md font-label-md hover:text-primary flex items-center"
            >
              See Full Report
              <Icon name="chevron_right" size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant">
                  <th className="pb-sm font-medium">Product</th>
                  <th className="pb-sm font-medium">Category</th>
                  <th className="pb-sm font-medium text-right">Stock Value</th>
                  <th className="pb-sm font-medium text-right">On Hand</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {metrics.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-lg text-center text-on-surface-variant">
                      No products yet.{" "}
                      <Link href="/products/new" className="text-primary hover:underline">
                        Add one →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  metrics.topProducts.map((p, i) => (
                    <TopRow
                      key={p.id}
                      name={p.name}
                      category={p.category}
                      value={money(p.value, currency)}
                      qty={`${p.qty.toLocaleString()} units`}
                      last={i === metrics.topProducts.length - 1}
                    />
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

function compactUnits(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function KpiCard({
  label,
  icon,
  iconClass,
  value,
  delta,
  deltaClass,
  deltaIcon,
}: {
  label: string;
  icon: string;
  iconClass: string;
  value: string;
  delta: string;
  deltaClass: string;
  deltaIcon: string;
}) {
  return (
    <div className="glass-card p-md rounded-xl flex flex-col justify-between">
      <div className="flex justify-between items-start mb-sm">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        <div className="bg-surface-container-low p-sm rounded-md">
          <Icon name={icon} className={iconClass} />
        </div>
      </div>
      <div>
        <div className="font-display-lg text-display-lg text-on-background">{value}</div>
        <div className={`flex items-center gap-xs mt-xs font-body-sm text-body-sm ${deltaClass}`}>
          <Icon name={deltaIcon} size={16} />
          <span>{delta}</span>
        </div>
      </div>
    </div>
  );
}

function ErpKpi({ href, label, icon, value, tone }: { href: string; label: string; icon: string; value: string; tone?: "pos" | "neg" | "warn" }) {
  const valueCls = tone === "pos" ? "text-primary" : tone === "neg" ? "text-error" : tone === "warn" ? "text-tertiary" : "text-on-background";
  return (
    <Link href={href} className="glass-card p-md rounded-xl flex flex-col gap-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between gap-sm">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide truncate">{label}</span>
        <Icon name={icon} size={18} className="text-on-surface-variant group-hover:text-primary transition-colors shrink-0" />
      </div>
      <span className={`font-display-lg text-[22px] font-bold tabular-nums ${valueCls}`}>{value}</span>
    </Link>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-xs">
      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function LowStockRow({
  name,
  sku,
  left,
  leftClass,
}: {
  name: string;
  sku: string;
  left: string;
  leftClass: string;
}) {
  return (
    <li className="flex justify-between items-center p-sm hover:bg-surface-container-low rounded-md transition-colors cursor-pointer group">
      <div className="flex items-center gap-md">
        <div className="w-10 h-10 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant border border-outline-variant">
          <Icon name="inventory_2" />
        </div>
        <div>
          <div className="font-body-md text-body-md text-on-background font-semibold">{name}</div>
          <div className="font-label-md text-label-md text-on-surface-variant">{sku}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-body-md text-body-md font-bold ${leftClass}`}>{left}</div>
        <button className="opacity-0 group-hover:opacity-100 font-label-md text-label-md text-primary transition-opacity">
          Reorder
        </button>
      </div>
    </li>
  );
}

function TopRow({
  name,
  category,
  value,
  qty,
  last,
}: {
  name: string;
  category: string;
  value: string;
  qty: string;
  last?: boolean;
}) {
  return (
    <tr className={`${last ? "" : "border-b border-surface-container-highest"} hover:bg-surface-container-low transition-colors`}>
      <td className="py-3 font-semibold text-on-background flex items-center gap-sm">
        <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center">
          <Icon name="inventory_2" size={18} />
        </div>
        {name}
      </td>
      <td className="py-3 text-on-surface-variant">{category}</td>
      <td className="py-3 text-right font-medium">{value}</td>
      <td className="py-3 text-right text-on-surface-variant flex items-center justify-end gap-xs">
        <Icon name="package_2" size={16} /> {qty}
      </td>
    </tr>
  );
}
