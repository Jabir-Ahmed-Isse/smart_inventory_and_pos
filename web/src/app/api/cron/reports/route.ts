import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDueReports } from "@/lib/reports/agent/scheduler";

// Never cache — this is a scheduler endpoint hit by an external cron.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------------------------------------------------------------------------
// AI Report Agent scheduler endpoint. Delegates to runDueReports() (shared with
// the in-process timer in instrumentation.ts). For each ENABLED org it checks —
// in the org's OWN timezone — whether a daily/weekly report is due and not yet
// produced, then generates + delivers it. Idempotent; one org failing never
// blocks the others.
//
//   • default   = "sweep" (generate if not yet produced, ignore the exact minute)
//   • ?strict=1 = honor the exact configured time
//
// Auth (any of): Vercel Cron "Authorization: Bearer $CRON_SECRET", ?secret=…, or
// "x-cron-secret" header. Without a secret env var set, the endpoint refuses.
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.REPORTS_CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 503 });

  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization"); // Vercel Cron: "Bearer <CRON_SECRET>"
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const provided = bearer || url.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (provided !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "service role not configured" }, { status: 503 });

  const strict = url.searchParams.get("strict") === "1";
  const { checked, generated, results } = await runDueReports(admin as unknown as SupabaseClient, { strict });
  return NextResponse.json({ ok: true, checked, generated, results });
}

// Allow POST too (some cron services only POST).
export const POST = GET;
