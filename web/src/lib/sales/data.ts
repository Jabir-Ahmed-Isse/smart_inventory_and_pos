import { getSalesAnalytics } from "@/lib/reports/data";
import { getSalesOrders, getTodaySales } from "@/lib/data";

// ---------------------------------------------------------------------------
// Presentation metadata for the sales_status enum.
// ---------------------------------------------------------------------------
export const SALES_STATUS_META: Record<string, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-primary-container/20 text-primary border border-primary/20" },
  processing: { label: "Processing", cls: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30" },
  draft: { label: "Draft", cls: "bg-surface-container-high text-on-surface-variant border border-outline-variant" },
  refunded: { label: "Refunded", cls: "bg-secondary-container/20 text-secondary border border-secondary-container/30" },
  cancelled: { label: "Cancelled", cls: "bg-error-container/30 text-error border border-error-container/40" },
};

export const PAY_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile: "Mobile",
  credit: "Credit",
};

// ---------------------------------------------------------------------------
// Sales overview — composes the existing analytics + orders queries so the
// dashboard shares one source of truth with /reports/sales and /orders
// (no duplicated SQL).
// ---------------------------------------------------------------------------
export async function getSalesOverview(orgId: string) {
  const [analytics, orders, today] = await Promise.all([
    getSalesAnalytics(orgId),
    getSalesOrders(orgId, 100),
    getTodaySales(orgId),
  ]);

  const due = orders.filter((o) => o.isDue);
  const dueTotal = due.reduce((s, o) => s + o.total, 0);
  const collected = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);

  return {
    analytics,
    recentOrders: orders.slice(0, 8),
    kpis: {
      revenue: analytics.revenue,
      orders: analytics.orders,
      avgOrder: analytics.avgOrder,
      todayTotal: today.total,
      todayCount: today.count,
      dueCount: due.length,
      dueTotal,
      collected,
      discounts: analytics.discounts,
      returnsValue: analytics.returns.value,
      returnsCount: analytics.returns.count,
    },
  };
}
