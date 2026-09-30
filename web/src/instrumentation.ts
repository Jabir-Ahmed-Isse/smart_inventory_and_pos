// ---------------------------------------------------------------------------
// Next.js instrumentation — runs once when the server process starts.
// The Node-only scheduler bootstrap lives in ./instrumentation-node and is
// imported ONLY inside the `NEXT_RUNTIME === 'nodejs'` guard, so its Node deps
// (nodemailer, etc.) are excluded from the Edge compilation.
// Opt out entirely with DISABLE_REPORT_SCHEDULER=1 (e.g. when an external cron
// drives /api/cron/reports instead).
// ---------------------------------------------------------------------------

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DISABLE_REPORT_SCHEDULER !== "1") {
    const { startReportScheduler } = await import("./instrumentation-node");
    startReportScheduler();
  }
}
