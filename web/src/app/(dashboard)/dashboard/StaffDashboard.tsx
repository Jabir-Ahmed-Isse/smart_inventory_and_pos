import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { DashboardMetrics } from "@/lib/data";

/**
 * Operational dashboard for staff & cashiers. Deliberately shows NO financial
 * figures (no revenue, inventory value, profit, or charts) — only what a
 * front-line user needs for their shift: quick actions and low-stock awareness.
 */
export function StaffDashboard({
  orgName,
  metrics,
  canSettle,
}: {
  orgName: string;
  metrics: Pick<DashboardMetrics, "productCount" | "customerCount" | "lowStockCount" | "lowStockItems">;
  /** Cashiers settle payments, so they also get an Orders shortcut. */
  canSettle: boolean;
}) {
  const actions = [
    { href: "/pos", label: "Open POS", desc: "Ring up a sale", icon: "point_of_sale", primary: true },
    ...(canSettle ? [{ href: "/orders", label: "Orders", desc: "Settle & view orders", icon: "receipt_long", primary: false }] : []),
    { href: "/customers", label: "Customers", desc: "Look up a customer", icon: "groups", primary: false },
    { href: "/timesheets", label: "Timesheets", desc: "Your hours", icon: "schedule", primary: false },
  ];

  return (
    <main className="flex-1 p-md md:p-gutter max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-headline-xl text-headline-xl text-on-background">Welcome back</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          {orgName} · Here’s what you need to get started today.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`group rounded-xl p-md border shadow-sm transition-colors flex items-center gap-md ${
              a.primary
                ? "bg-primary text-on-primary border-primary hover:bg-primary/90"
                : "bg-surface border-outline-variant hover:bg-surface-container-low"
            }`}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${a.primary ? "bg-white/15" : "bg-primary/10 text-primary"}`}>
              <Icon name={a.icon} size={22} />
            </div>
            <div className="min-w-0">
              <div className={`font-headline-lg text-[17px] ${a.primary ? "text-on-primary" : "text-on-surface"}`}>{a.label}</div>
              <div className={`font-label-md text-label-md ${a.primary ? "text-on-primary/80" : "text-on-surface-variant"}`}>{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Operational stats — counts only, no money */}
      <div className="grid grid-cols-3 gap-md mb-lg">
        <StatCard icon="inventory_2" label="Products" value={metrics.productCount.toLocaleString()} />
        <StatCard icon="groups" label="Customers" value={metrics.customerCount.toLocaleString()} />
        <StatCard icon="warning" label="Low Stock" value={metrics.lowStockCount.toLocaleString()} tone={metrics.lowStockCount > 0 ? "warn" : "ok"} />
      </div>

      {/* Low-stock heads-up */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex items-center gap-sm">
          <Icon name="production_quantity_limits" className="text-error" size={20} />
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Low stock to watch</h3>
        </div>
        {metrics.lowStockItems.length === 0 ? (
          <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">Everything is well stocked. 🎉</p>
        ) : (
          <ul className="divide-y divide-outline-variant/60">
            {metrics.lowStockItems.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-sm p-md">
                <div className="min-w-0">
                  <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{p.name}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">{p.sku}</p>
                </div>
                <span className={`text-body-sm font-body-sm font-semibold whitespace-nowrap ${p.status === "out" ? "text-error" : "text-tertiary"}`}>
                  {p.qty} left
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone?: "warn" | "ok" }) {
  const iconCls = tone === "warn" ? "text-error bg-error-container/30" : tone === "ok" ? "text-primary bg-primary-container/20" : "text-on-surface-variant bg-surface-container-high";
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm flex flex-col gap-sm">
      <div className="flex items-start justify-between">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
          <Icon name={icon} size={20} />
        </div>
      </div>
      <div className="font-display-lg text-[26px] leading-none font-bold tracking-tight text-on-surface" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
