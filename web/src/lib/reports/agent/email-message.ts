import type { ReportFacts } from "./facts";
import type { ReportInsight } from "./ai";
import { buildWhatsAppMessage } from "./whatsapp-message";

// ---------------------------------------------------------------------------
// Report email. Returns { subject, text, html }. The plain-text part reuses the
// concise WhatsApp summary (readable in any client); the HTML part is a styled,
// inline-CSS layout that renders well in Gmail and other mail apps.
// ---------------------------------------------------------------------------

export type ReportEmail = { subject: string; text: string; html: string };

export function buildReportEmail(f: ReportFacts, insight: ReportInsight | null, reportType: string): ReportEmail {
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: f.currency, maximumFractionDigits: 0 }).format(n);
  const pct = (p: number | null) => (p == null ? "" : ` (${p >= 0 ? "▲" : "▼"}${Math.abs(p)}%)`);
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const label = reportType === "weekly" ? "Weekly" : "Daily";

  const subject = `Inventory Pro — ${label} Report · ${f.period.label}`;
  const text = buildWhatsAppMessage(f, insight, reportType);

  const kpi = (title: string, value: string, sub = "") => `
    <td style="padding:14px 16px;border:1px solid #e6e9ef;border-radius:12px;background:#ffffff;vertical-align:top;">
      <div style="font:600 11px/1.2 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7a8699;">${title}</div>
      <div style="font:700 22px/1.3 Arial,sans-serif;color:#12203a;margin-top:4px;">${value}</div>
      ${sub ? `<div style="font:400 12px/1.4 Arial,sans-serif;color:#7a8699;margin-top:2px;">${sub}</div>` : ""}
    </td>`;

  const unpaidRows = f.unpaidOrders.slice(0, 8).map((u) =>
    `<tr><td style="padding:6px 0;font:400 14px Arial,sans-serif;color:#28324a;">${esc(u.customerName)}</td>
     <td style="padding:6px 0;font:600 14px Arial,sans-serif;color:#b4232a;text-align:right;">${money(u.due)}</td></tr>`).join("");

  const recRows = (insight?.recommendations ?? []).slice(0, 4).map((r) =>
    `<li style="margin:4px 0;font:400 14px/1.5 Arial,sans-serif;color:#28324a;">${esc(r)}</li>`).join("");

  const branchRows = f.branchBreakdown.slice(0, 6).map((b) =>
    `<tr><td style="padding:6px 0;font:400 14px Arial,sans-serif;color:#28324a;">${esc(b.name)}</td>
     <td style="padding:6px 0;font:400 14px Arial,sans-serif;color:#7a8699;text-align:center;">${b.orders}</td>
     <td style="padding:6px 0;font:600 14px Arial,sans-serif;color:#12203a;text-align:right;">${money(b.sales)} <span style="color:#7a8699;font-weight:400;">(${b.sharePct}%)</span></td></tr>`).join("");

  const reorder = f.reorderRecommendations[0];

  const html = `
  <div style="margin:0;padding:24px;background:#f4f6fa;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="background:#0f8a4c;border-radius:14px 14px 0 0;padding:22px 24px;">
        <div style="font:700 20px/1.2 Arial,sans-serif;color:#ffffff;">📊 Inventory Pro</div>
        <div style="font:400 13px/1.4 Arial,sans-serif;color:#d7f0e0;margin-top:2px;">${label} Business Report · ${esc(f.period.label)}</div>
      </div>
      <div style="background:#ffffff;padding:20px 24px 8px;border-left:1px solid #e6e9ef;border-right:1px solid #e6e9ef;">
        ${insight?.summary ? `<p style="font:400 15px/1.6 Arial,sans-serif;color:#28324a;margin:0 0 16px;">${esc(insight.summary)}</p>` : ""}
        <table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="border-collapse:separate;margin:0 -8px;">
          <tr>${kpi("Sales", money(f.sales.total) + pct(f.sales.changePct), `${f.sales.orders} orders`)}${kpi("Collected", money(f.payments.collected), `Unpaid ${money(f.payments.unpaid)}`)}</tr>
          <tr>${kpi("Net Profit", money(f.profit.netProfit), f.profit.marginPct != null ? `${f.profit.marginPct}% margin` : "")}${kpi("Inventory", `${f.inventory.critical + f.inventory.outOfStock} critical`, `${f.inventory.lowStock} low stock`)}</tr>
        </table>
      </div>
      ${reorder ? `<div style="background:#ffffff;padding:4px 24px 12px;border-left:1px solid #e6e9ef;border-right:1px solid #e6e9ef;">
        <div style="background:#fff6ed;border:1px solid #f2d5b3;border-radius:10px;padding:12px 14px;font:400 14px/1.5 Arial,sans-serif;color:#8a5a12;">
          🛒 <b>Reorder ${esc(reorder.name)}</b> — ${reorder.qty} left, recommend ${reorder.recommendedReorder}${f.reorderRecommendations.length > 1 ? ` · +${f.reorderRecommendations.length - 1} more` : ""}
        </div></div>` : ""}
      ${branchRows ? `<div style="background:#ffffff;padding:8px 24px 4px;border-left:1px solid #e6e9ef;border-right:1px solid #e6e9ef;">
        <div style="font:600 12px/1.2 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7a8699;margin:8px 0 4px;">Sales by branch</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${branchRows}</table>
      </div>` : ""}
      ${unpaidRows ? `<div style="background:#ffffff;padding:8px 24px 4px;border-left:1px solid #e6e9ef;border-right:1px solid #e6e9ef;">
        <div style="font:600 12px/1.2 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7a8699;margin:8px 0 4px;">Unpaid customers</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${unpaidRows}</table>
      </div>` : ""}
      ${recRows ? `<div style="background:#ffffff;padding:8px 24px 12px;border-left:1px solid #e6e9ef;border-right:1px solid #e6e9ef;">
        <div style="font:600 12px/1.2 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7a8699;margin:8px 0 4px;">Recommended actions</div>
        <ul style="margin:0;padding-left:20px;">${recRows}</ul>
      </div>` : ""}
      <div style="background:#ffffff;border:1px solid #e6e9ef;border-top:0;border-radius:0 0 14px 14px;padding:16px 24px;">
        <div style="font:400 12px/1.5 Arial,sans-serif;color:#98a2b3;">Numbers are computed from your live data. Open Inventory Pro for the full report. This is an automated message.</div>
      </div>
    </div>
  </div>`;

  return { subject, text, html };
}
