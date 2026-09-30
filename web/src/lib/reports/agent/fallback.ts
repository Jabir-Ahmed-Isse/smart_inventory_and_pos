import type { ReportFacts } from "./facts";
import type { ReportInsight } from "./ai";

// ---------------------------------------------------------------------------
// Deterministic fallback insight — built purely from the facts, no AI. Ensures
// the report is fully usable (grounded, real numbers) even when no AI provider
// is configured or the AI call fails. Same shape as the AI output.
// ---------------------------------------------------------------------------

export function fallbackInsight(f: ReportFacts): ReportInsight {
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: f.currency, maximumFractionDigits: 0 }).format(n);
  const pct = (p: number | null) => (p == null ? "" : `${p >= 0 ? "↑" : "↓"}${Math.abs(p)}%`);

  const isDaily = f.period.type === "daily";
  const changeTxt = f.sales.changePct == null ? "" : ` (${pct(f.sales.changePct)} vs previous ${isDaily ? "day" : "week"})`;

  const highlights: string[] = [];
  highlights.push(`Sales ${money(f.sales.total)} across ${f.sales.orders} order${f.sales.orders === 1 ? "" : "s"}${changeTxt}.`);
  if (f.sales.topProducts[0]) highlights.push(`Top product: ${f.sales.topProducts[0].name} — ${f.sales.topProducts[0].units} units.`);
  if (f.profit.revenue > 0) highlights.push(`Net profit ${money(f.profit.netProfit)}${f.profit.marginPct != null ? ` (${f.profit.marginPct}% margin)` : ""}.`);
  highlights.push(`Collected ${money(f.payments.collected)}; ${money(f.payments.unpaid)} still unpaid.`);

  const warnings: string[] = [];
  if (f.inventory.outOfStock > 0) warnings.push(`${f.inventory.outOfStock} product${f.inventory.outOfStock === 1 ? " is" : "s are"} out of stock.`);
  if (f.inventory.critical > 0) warnings.push(`${f.inventory.critical} product${f.inventory.critical === 1 ? " is" : "s are"} at critical stock.`);
  if (f.receivables.total > 0) warnings.push(`${money(f.receivables.total)} outstanding across ${f.receivables.customers.length} customer${f.receivables.customers.length === 1 ? "" : "s"}.`);
  if (f.sales.changePct != null && f.sales.changePct <= -15) warnings.push(`Sales fell ${Math.abs(f.sales.changePct)}% vs the previous ${isDaily ? "day" : "week"}.`);

  const inventory_alerts = f.criticalStock.slice(0, 5).map((p) => `${p.name}: ${p.qty} left${p.daysRemaining != null ? `, ~${p.daysRemaining}d cover` : ""}${p.recommendedReorder > 0 ? `, reorder ${p.recommendedReorder}` : ""}.`);

  const payment_alerts = f.receivables.customers.slice(0, 5).map((c) => `${c.customerName}: ${money(c.outstanding)} outstanding${c.oldestDueDays > 0 ? `, oldest ${c.oldestDueDays}d` : ""}.`);

  const financial_insights: string[] = [];
  financial_insights.push(`Revenue ${money(f.profit.revenue)}, COGS ${money(f.profit.cogs)}, gross ${money(f.profit.grossProfit)}, expenses ${money(f.profit.expenses)}, net ${money(f.profit.netProfit)}.`);
  if (f.expenses.byCategory[0]) financial_insights.push(`Largest expense category: ${f.expenses.byCategory[0].category} — ${money(f.expenses.byCategory[0].amount)}.`);

  const recommendations: string[] = [];
  if (f.reorderRecommendations[0]) recommendations.push(`Reorder ${f.reorderRecommendations[0].name} (${f.reorderRecommendations[0].recommendedReorder} units).`);
  if (f.receivables.customers[0]) recommendations.push(`Follow up ${f.receivables.customers[0].customerName} for ${money(f.receivables.customers[0].outstanding)}.`);
  if (f.unpaidOrders.length > 1) recommendations.push(`Collect on ${f.unpaidOrders.length} unpaid order${f.unpaidOrders.length === 1 ? "" : "s"} (${money(f.payments.unpaid)}).`);

  const summary = `${isDaily ? "Today" : "This week"}: ${money(f.sales.total)} sales${changeTxt}, net profit ${money(f.profit.netProfit)}. ${f.payments.unpaid > 0 ? `${money(f.payments.unpaid)} unpaid. ` : ""}${f.inventory.critical + f.inventory.outOfStock > 0 ? `${f.inventory.critical + f.inventory.outOfStock} inventory item(s) need attention.` : "Inventory healthy."}`;

  return { summary, highlights, warnings, inventory_alerts, payment_alerts, financial_insights, recommendations };
}
