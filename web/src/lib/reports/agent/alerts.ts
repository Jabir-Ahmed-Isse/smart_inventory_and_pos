import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportFacts } from "./facts";

// ---------------------------------------------------------------------------
// Alert engine with DEDUPLICATION. Alerts are keyed by
// (organization_id, entity_type, entity_id, alert_type). We upsert the current
// set (reactivating any that resolved-then-returned) and mark the rest resolved.
// So "Product X is low" is not re-created every run — the same row is updated.
// ---------------------------------------------------------------------------

type Desired = { entity_type: string; entity_id: string; alert_type: string; severity: "info" | "warning" | "critical"; message: string };

function buildDesired(f: ReportFacts): Desired[] {
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: f.currency, maximumFractionDigits: 0 }).format(n);
  const out: Desired[] = [];

  for (const p of f.criticalStock.slice(0, 15)) {
    const oos = p.qty <= 0;
    out.push({
      entity_type: "product", entity_id: p.sku || p.name,
      alert_type: oos ? "out_of_stock" : "critical_stock",
      severity: "critical",
      message: oos ? `${p.name} is out of stock` : `${p.name} critical: ${p.qty} left${p.daysRemaining != null ? `, ~${p.daysRemaining}d cover` : ""}`,
    });
  }
  for (const p of f.lowStockItems.slice(0, 15)) {
    if (p.qty <= 0 || (p.daysRemaining != null && p.daysRemaining <= 2)) continue; // already critical
    out.push({ entity_type: "product", entity_id: p.sku || p.name, alert_type: "low_stock", severity: "warning", message: `${p.name} low: ${p.qty} left` });
  }
  for (const c of f.receivables.customers.slice(0, 15)) {
    if (c.oldestDueDays >= 14) {
      out.push({ entity_type: "customer", entity_id: c.customerName, alert_type: "overdue_balance", severity: c.oldestDueDays >= 30 ? "critical" : "warning", message: `${c.customerName} owes ${money(c.outstanding)} (oldest ${c.oldestDueDays}d)` });
    } else if (c.outstanding > 0) {
      out.push({ entity_type: "customer", entity_id: c.customerName, alert_type: "unpaid_customer", severity: "info", message: `${c.customerName} owes ${money(c.outstanding)}` });
    }
  }
  if (f.sales.changePct != null && f.sales.changePct <= -20) {
    out.push({ entity_type: "sales", entity_id: "-", alert_type: "sales_decline", severity: "warning", message: `Sales fell ${Math.abs(f.sales.changePct)}% vs the previous period` });
  }
  return out;
}

const keyOf = (a: { entity_type: string; entity_id: string; alert_type: string }) => `${a.entity_type}|${a.entity_id}|${a.alert_type}`;

/** Upserts the current alert set and resolves alerts that no longer apply. */
export async function syncAlerts(admin: SupabaseClient, orgId: string, facts: ReportFacts): Promise<void> {
  const desired = buildDesired(facts);
  const now = new Date().toISOString();

  if (desired.length) {
    await admin.from("report_alerts").upsert(
      desired.map((d) => ({ organization_id: orgId, ...d, status: "active", last_notified: now, resolved_at: null, updated_at: now })),
      { onConflict: "organization_id,entity_type,entity_id,alert_type" },
    );
  }

  // Resolve active alerts that are no longer in the desired set.
  const { data: active } = await admin
    .from("report_alerts")
    .select("id, entity_type, entity_id, alert_type")
    .eq("organization_id", orgId)
    .eq("status", "active");
  const desiredKeys = new Set(desired.map(keyOf));
  const stale = ((active ?? []) as { id: string; entity_type: string; entity_id: string; alert_type: string }[]).filter((a) => !desiredKeys.has(keyOf(a)));
  if (stale.length) {
    await admin.from("report_alerts").update({ status: "resolved", resolved_at: now, updated_at: now }).in("id", stale.map((a) => a.id));
  }
}
