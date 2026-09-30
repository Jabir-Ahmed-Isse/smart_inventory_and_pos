import type { ReportFacts } from "./facts";
import type { ReportInsight } from "./ai";

// ---------------------------------------------------------------------------
// Concise WhatsApp message — NOT the full ERP report. Shows only the top items;
// if lists are long, it says how many and points to the app (Section 24/25).
// ---------------------------------------------------------------------------

export function buildWhatsAppMessage(f: ReportFacts, insight: ReportInsight | null, reportType: string): string {
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: f.currency, maximumFractionDigits: 0 }).format(n);
  const pct = (p: number | null) => (p == null ? "" : ` ${p >= 0 ? "↑" : "↓"}${Math.abs(p)}%`);
  const L: string[] = [];

  L.push(`*Inventory Pro — ${reportType === "weekly" ? "Weekly" : "Daily"} Report*`);
  L.push(`📅 ${f.period.label}`);
  L.push("");
  L.push(`💰 *Sales* ${money(f.sales.total)}${pct(f.sales.changePct)}`);
  L.push(`${f.sales.orders} orders`);
  L.push("");
  L.push(`💵 *Payments*`);
  L.push(`Collected: ${money(f.payments.collected)}`);
  L.push(`Unpaid: ${money(f.payments.unpaid)}`);

  if (f.unpaidOrders.length) {
    L.push("");
    L.push(`⚠️ *Unpaid customers*`);
    for (const u of f.unpaidOrders.slice(0, 5)) L.push(`• ${u.customerName} — ${money(u.due)}`);
    if (f.unpaidOrders.length > 5) L.push(`…and ${f.unpaidOrders.length - 5} more.`);
  }

  L.push("");
  L.push(`📈 *Profit* ${money(f.profit.netProfit)}${f.profit.marginPct != null ? ` (${f.profit.marginPct}% margin)` : ""}`);

  L.push("");
  L.push(`📦 *Inventory*`);
  L.push(`🔴 Critical: ${f.inventory.critical + f.inventory.outOfStock}   🟠 Low: ${f.inventory.lowStock}`);
  if (f.reorderRecommendations.length) {
    const top = f.reorderRecommendations[0];
    L.push(`🛒 Reorder ${top.name} — ${top.qty} left, recommend ${top.recommendedReorder}`);
    if (f.reorderRecommendations.length > 1) L.push(`+${f.reorderRecommendations.length - 1} more to reorder.`);
  }

  if (f.expenses.total > 0) {
    L.push("");
    L.push(`💸 *Expenses* ${money(f.expenses.total)}`);
  }

  if (insight?.recommendations?.length) {
    L.push("");
    L.push(`🎯 *Recommended*`);
    insight.recommendations.slice(0, 3).forEach((r, i) => L.push(`${i + 1}. ${r}`));
  }

  if (f.branchBreakdown.length) {
    L.push("");
    L.push(`🏢 *By branch*`);
    for (const b of f.branchBreakdown.slice(0, 4)) L.push(`• ${b.name}: ${money(b.sales)} (${b.sharePct}%)`);
    if (f.branchBreakdown.length > 4) L.push(`…and ${f.branchBreakdown.length - 4} more.`);
  }

  L.push("");
  L.push(`Open Inventory Pro for the complete report.`);
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Structured body variables for the Meta report TEMPLATE (WHATSAPP_TEMPLATE_NAME).
// Meta forbids newlines inside a template variable, so each item is a single
// line. The order MUST match the approved template's {{1}}…{{6}} placeholders:
//
//   *Inventory Pro — Business Report*
//   📅 {{1}}
//
//   💰 Sales: {{2}}
//   💵 Payments: {{3}}
//   📈 Profit: {{4}}
//   📦 Inventory: {{5}}
//   🎯 Action: {{6}}
//
//   Open Inventory Pro for the full report.
// ---------------------------------------------------------------------------
export function buildWhatsAppTemplateParams(f: ReportFacts, insight: ReportInsight | null): string[] {
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: f.currency, maximumFractionDigits: 0 }).format(n);
  const pct = (p: number | null) => (p == null ? "" : ` ${p >= 0 ? "↑" : "↓"}${Math.abs(p)}%`);

  const period = f.period.label;
  const sales = `${money(f.sales.total)} from ${f.sales.orders} orders${pct(f.sales.changePct)}`;
  const payments = `Collected ${money(f.payments.collected)} · Unpaid ${money(f.payments.unpaid)}`;
  const profit = `${money(f.profit.netProfit)} net${f.profit.marginPct != null ? ` (${f.profit.marginPct}% margin)` : ""}`;
  const inventory = `${f.inventory.critical + f.inventory.outOfStock} critical · ${f.inventory.lowStock} low`;

  let action: string;
  if (f.reorderRecommendations.length) {
    const top = f.reorderRecommendations[0];
    const more = f.reorderRecommendations.length > 1 ? ` (+${f.reorderRecommendations.length - 1} more)` : "";
    action = `Reorder ${top.name} — ${top.qty} left, order ${top.recommendedReorder}${more}`;
  } else if (insight?.recommendations?.length) {
    action = insight.recommendations[0];
  } else {
    action = "Stock levels healthy — no action needed";
  }

  return [period, sales, payments, profit, inventory, action];
}
