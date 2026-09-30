import type { SupabaseClient } from "@supabase/supabase-js";
import { dailyPeriod, weeklyPeriod, localClock } from "./period";
import { generateReport } from "./generate";
import { deliverReport } from "./deliver";
import { shapeReportSettings } from "./settings";

// ---------------------------------------------------------------------------
// The report scheduler core, shared by the /api/cron/reports endpoint AND the
// in-process timer (instrumentation.ts). For each ENABLED org it checks — in the
// org's OWN timezone — whether a daily/weekly report is due for the current
// period and hasn't been produced yet, then generates + delivers it (in-app,
// email, WhatsApp per the org's settings). Idempotent via last_daily_period /
// last_weekly_period, so it fires at most once per period no matter how often
// it runs. One org failing never blocks the others.
//
//   • strict:true  → honor the exact configured time (fire only once local time
//     has reached daily_time / weekly_time). Used by the minute-by-minute timer.
//   • strict:false → "sweep": generate if not yet produced, ignoring the exact
//     minute (for once-a-day external crons that can't hit each org's minute).
//
// Periods match the manual "Generate now" buttons: the CURRENT local day / week,
// so what an owner sees on demand is exactly what arrives on schedule.
// ---------------------------------------------------------------------------

export type SweepResult = {
  checked: number;
  generated: number;
  results: { orgId: string; type: string; status: string; detail?: string }[];
};

type OrgMeta = { currency: string; tz: string };

export async function runDueReports(db: SupabaseClient, opts: { strict: boolean; now?: Date }): Promise<SweepResult> {
  const now = opts.now ?? new Date();

  const { data: rows } = await db.from("ai_report_settings").select("*").eq("enabled", true);
  const settingsRows = (rows ?? []) as Record<string, unknown>[];
  if (settingsRows.length === 0) return { checked: 0, generated: 0, results: [] };

  const orgIds = settingsRows.map((r) => r.organization_id as string);
  const { data: orgRows } = await db.from("organizations").select("id, currency, timezone").in("id", orgIds);
  const orgMeta = new Map<string, OrgMeta>(
    ((orgRows ?? []) as { id: string; currency: string | null; timezone: string | null }[]).map(
      (o) => [o.id, { currency: o.currency ?? "USD", tz: o.timezone || "UTC" }] as const,
    ),
  );

  const results: SweepResult["results"] = [];
  let generated = 0;

  for (const row of settingsRows) {
    const orgId = row.organization_id as string;
    const meta = orgMeta.get(orgId) ?? { currency: "USD", tz: "UTC" };
    // shapeReportSettings expects the DB row shape; cast is safe (select *).
    const s = shapeReportSettings(row as never);
    const clock = localClock(meta.tz, now);

    try {
      // ---- Daily: the current local day, delivered at/after the configured time.
      if (s.dailyEnabled) {
        const period = dailyPeriod(meta.tz, now);
        const notYet = s.lastDailyPeriod !== period.periodStart;
        const timeOk = !opts.strict || clock.hhmm >= s.dailyTime;
        if (notYet && timeOk) {
          const report = await generateReport(db, orgId, meta.currency, period);
          await deliverReport(db, report, s);
          await db.from("ai_report_settings").update({ last_daily_period: period.periodStart, updated_at: now.toISOString() }).eq("organization_id", orgId);
          generated++;
          results.push({ orgId, type: "daily", status: "generated" });
        }
      }

      // ---- Weekly: only on the configured weekday (org tz), at/after the time.
      if (s.weeklyEnabled && clock.dow === s.weeklyDow) {
        const period = weeklyPeriod(meta.tz, now, s.weeklyDow);
        const notYet = s.lastWeeklyPeriod !== period.periodStart;
        const timeOk = !opts.strict || clock.hhmm >= s.weeklyTime;
        if (notYet && timeOk) {
          const report = await generateReport(db, orgId, meta.currency, period);
          await deliverReport(db, report, s);
          await db.from("ai_report_settings").update({ last_weekly_period: period.periodStart, updated_at: now.toISOString() }).eq("organization_id", orgId);
          generated++;
          results.push({ orgId, type: "weekly", status: "generated" });
        }
      }
    } catch (e) {
      results.push({ orgId, type: "-", status: "error", detail: e instanceof Error ? e.message : "failed" });
    }
  }

  return { checked: settingsRows.length, generated, results };
}
