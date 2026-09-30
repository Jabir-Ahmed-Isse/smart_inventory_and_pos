import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportPeriod } from "./period";
import { buildReportFacts, type ReportFacts } from "./facts";
import { generateInsight, type ReportInsight } from "./ai";
import { syncAlerts } from "./alerts";

export type GeneratedReport = {
  id: string | null;
  reportType: string;
  facts: ReportFacts;
  insight: ReportInsight;
  source: "gemini" | "anthropic" | "deterministic";
  period: ReportPeriod;
};

/**
 * The report pipeline for ONE org + period:
 *  1. compute deterministic facts, 2. generate AI insight (fallback if needed),
 *  3. upsert into ai_reports (idempotent on org+type+period — a re-run updates,
 *     never duplicates), 4. sync deduplicated alerts.
 * Writes go through the passed admin (service-role) client — ai_reports has no
 * user INSERT policy, so this must run with elevated rights (scheduler / owner
 * action). Always scoped by orgId.
 */
export async function generateReport(admin: SupabaseClient, orgId: string, currency: string, period: ReportPeriod): Promise<GeneratedReport> {
  const facts = await buildReportFacts(admin, orgId, currency, period);
  const { insight, source } = await generateInsight(facts);

  const { data } = await admin
    .from("ai_reports")
    .upsert(
      {
        organization_id: orgId,
        report_type: period.type,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        facts,
        ai: insight,
        ai_source: source,
        summary: insight.summary,
      },
      { onConflict: "organization_id,report_type,period_start,period_end" },
    )
    .select("id")
    .single();

  await syncAlerts(admin, orgId, facts);

  return { id: (data as { id: string } | null)?.id ?? null, reportType: period.type, facts, insight, source, period };
}

/** Records a delivery attempt on a report's `deliveries` log (append). */
export async function recordDelivery(admin: SupabaseClient, reportId: string, channel: string, status: "sent" | "failed" | "skipped", detail: string): Promise<void> {
  const { data } = await admin.from("ai_reports").select("deliveries").eq("id", reportId).maybeSingle();
  const existing = (((data as { deliveries?: unknown[] } | null)?.deliveries) ?? []) as unknown[];
  const entry = { channel, status, detail, at: new Date().toISOString() };
  await admin.from("ai_reports").update({ deliveries: [...existing, entry] }).eq("id", reportId);
}
