import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { InventoryDonut } from "@/components/charts/InventoryDonut";
import { getActiveOrg } from "@/lib/org";
import {
  getDashboardMetrics,
  getTodaySales,
  getDashboardCharts,
  money,
  compactMoney,
  type ChartData,
} from "@/lib/data";

export const metadata = { title: "Executive Dashboard — Inventory Pro" };

const EMPTY_CHARTS: ChartData = {
  revenue: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [0, 0, 0, 0, 0, 0, 0] },
  inventory: [],
  totalUnits: 0,
};

export default async function DashboardPage() {
  const org = await getActiveOrg();
  const metrics = org
    ? await getDashboardMetrics(org.orgId)
    : {
        productCount: 0,
        customerCount: 0,
        lowStockCount: 0,
        inventoryValue: 0,
        netProfit: 0,
        lowStockItems: [],
        topProducts: [],
      };
  const todaySales = org ? await getTodaySales(org.orgId) : { total: 0, count: 0 };
  const charts = org ? await getDashboardCharts(org.orgId) : EMPTY_CHARTS;
  const currency = org?.currency ?? "USD";
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="flex-1 p-md md:p-gutter max-w-container-max mx-auto w-full">
      {/* Page header */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-background">
            Executive Overview
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {org ? `${org.orgName} · ` : ""}Live metrics for {today}
          </p>
        </div>
        <div className="hidden sm:flex gap-sm">
          <button className="flex items-center gap-sm px-md py-sm border border-outline-variant rounded-md font-label-md text-label-md hover:bg-surface-container-low transition-colors">
            <Icon name="calendar_today" size={16} />
            Today
          </button>
          <button className="flex items-center gap-sm px-md py-sm bg-primary text-on-primary rounded-md font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm">
            <Icon name="download" size={16} />
            Export
          </button>
        </div>
      </div>

      {/* KPI grid — live */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <KpiCard
          label="Today's Sales"
          icon="point_of_sale"
          iconClass="text-primary"
          value={compactMoney(todaySales.total, currency)}
          delta={`${todaySales.count} ${todaySales.count === 1 ? "order" : "orders"} today`}
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
