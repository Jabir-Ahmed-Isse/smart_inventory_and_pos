import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ReportFacts } from "./facts";
import type { ReportInsight } from "./ai";

export type ReportListItem = {
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  sales: number;
  netProfit: number;
  unpaid: number;
  inventoryAlerts: number;
  aiSource: string;
  createdAt: string;
  delivered: number;
};

export type FullReport = {
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  facts: ReportFacts;
  insight: ReportInsight | null;
  aiSource: string;
  createdAt: string;
  deliveries: { channel: string; status: string; detail: string; at: string }[];
};

/** Recent reports for the history UI. Management-only (RLS on ai_reports). */
export async function listReports(orgId: string, limit = 30): Promise<ReportListItem[]> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data } = await supabase
    .from("ai_reports")
    .select("id, report_type, period_start, period_end, facts, ai_source, deliveries, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const f = (r.facts ?? {}) as Partial<ReportFacts>;
    const deliveries = (r.deliveries ?? []) as { status: string }[];
    return {
      id: String(r.id),
      reportType: String(r.report_type),
      periodStart: String(r.period_start),
      periodEnd: String(r.period_end),
      sales: f.sales?.total ?? 0,
      netProfit: f.profit?.netProfit ?? 0,
      unpaid: f.payments?.unpaid ?? 0,
      inventoryAlerts: (f.inventory?.outOfStock ?? 0) + (f.inventory?.critical ?? 0),
      aiSource: String(r.ai_source ?? "deterministic"),
      createdAt: String(r.created_at),
      delivered: deliveries.filter((d) => d.status === "sent").length,
    };
  });
}

/** One full report by id. */
export async function getReportById(orgId: string, id: string): Promise<FullReport | null> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data } = await supabase
    .from("ai_reports")
    .select("id, report_type, period_start, period_end, facts, ai, ai_source, deliveries, created_at")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    reportType: String(r.report_type),
    periodStart: String(r.period_start),
    periodEnd: String(r.period_end),
    facts: (r.facts ?? {}) as ReportFacts,
    insight: (r.ai ?? null) as ReportInsight | null,
    aiSource: String(r.ai_source ?? "deterministic"),
    createdAt: String(r.created_at),
    deliveries: (r.deliveries ?? []) as { channel: string; status: string; detail: string; at: string }[],
  };
}

export type ActiveAlert = { id: string; entityType: string; alertType: string; severity: string; message: string; firstSeen: string };

/** Active (unresolved) alerts for the org, most severe first. */
export async function getActiveAlerts(orgId: string): Promise<ActiveAlert[]> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data } = await supabase
    .from("report_alerts")
    .select("id, entity_type, alert_type, severity, message, first_seen")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("first_seen", { ascending: false });
  const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => ({ id: String(r.id), entityType: String(r.entity_type), alertType: String(r.alert_type), severity: String(r.severity), message: String(r.message), firstSeen: String(r.first_seen) }))
    .sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
}
