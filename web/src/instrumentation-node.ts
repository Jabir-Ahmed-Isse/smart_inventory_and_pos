// ---------------------------------------------------------------------------
// Node-only scheduler bootstrap. This module is imported ONLY from
// instrumentation.ts under `process.env.NEXT_RUNTIME === 'nodejs'`, so it (and
// its Node-only transitive deps like nodemailer) never enter the Edge/webpack
// compilation. Starts an in-process timer that fires due AI reports at their
// configured time while the app is running.
// ---------------------------------------------------------------------------

import { createAdminClient } from "@/lib/supabase/admin";
import { runDueReports } from "@/lib/reports/agent/scheduler";

export function startReportScheduler() {
  const g = globalThis as unknown as { __reportSchedulerStarted?: boolean };
  if (g.__reportSchedulerStarted) return;
  g.__reportSchedulerStarted = true;

  const tick = async () => {
    try {
      const admin = createAdminClient();
      if (!admin) return; // no service-role key → can't run the scheduler
      const r = await runDueReports(admin as never, { strict: true });
      if (r.generated > 0) console.log(`[report-scheduler] generated ${r.generated} report(s):`, r.results);
    } catch (e) {
      console.error("[report-scheduler] tick failed:", e instanceof Error ? e.message : e);
    }
  };

  const intervalMs = Number(process.env.REPORT_SCHEDULER_INTERVAL_MS) || 60_000;
  setTimeout(tick, 10_000);       // first check shortly after startup
  setInterval(tick, intervalMs);  // then every minute
  console.log(`[report-scheduler] started — checking every ${Math.round(intervalMs / 1000)}s (strict, org-timezone aware)`);
}
