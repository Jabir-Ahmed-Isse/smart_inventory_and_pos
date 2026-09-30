// ---------------------------------------------------------------------------
// Timezone-aware report periods. Report boundaries are computed in the
// ORGANIZATION's timezone (never blind server UTC), so a "day" is the tenant's
// local calendar day. Uses Intl (no external tz library).
// ---------------------------------------------------------------------------

export type ReportPeriod = {
  type: "daily" | "weekly";
  /** UTC ISO instant for the inclusive start of the period. */
  startISO: string;
  /** UTC ISO instant for the exclusive end of the period. */
  endISO: string;
  /** Previous comparable period (for % change). */
  prevStartISO: string;
  prevEndISO: string;
  /** Local calendar keys (YYYY-MM-DD) stored on the report for idempotency. */
  periodStart: string;
  periodEnd: string;
  /** Human label, e.g. "August 20, 2026" or "Aug 14 – Aug 20, 2026". */
  label: string;
  timezone: string;
};

/** Offset (ms) between wall-clock time in `tz` and UTC at the given instant. */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour === 24 ? 0 : +m.hour, +m.minute, +m.second);
  return asUTC - date.getTime();
}

/** The UTC instant whose wall-clock time in `tz` is the given local Y-M-D h:m. */
export function zonedTimeToUtc(tz: string, y: number, mo: number, d: number, h = 0, mi = 0): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMs(tz, new Date(guess));
  return new Date(guess - offset);
}

/** Local calendar parts (year/month/day + weekday 0=Sun) for an instant in `tz`. */
export function zonedParts(tz: string, date: Date): { y: number; mo: number; d: number; dow: number } {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) m[p.type] = p.value;
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +m.year, mo: +m.month, d: +m.day, dow: dowMap[m.weekday] ?? 0 };
}

const key = (y: number, mo: number, d: number) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Current wall clock in `tz`: date key (YYYY-MM-DD), weekday (0=Sun), and HH:MM. */
export function localClock(tz: string, date: Date = new Date()): { dateKey: string; dow: number; hhmm: string } {
  const p = zonedParts(tz, date);
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return { dateKey: key(p.y, p.mo, p.d), dow: p.dow, hhmm: t };
}

/** Yesterday, as an instant that falls within the previous local calendar day. */
export function yesterday(date: Date = new Date()): Date {
  return new Date(date.getTime() - 86400000);
}

function labelDate(tz: string, iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: tz, month: "long", day: "numeric", year: "numeric" });
}
function labelShort(tz: string, iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
}

/** Add `n` days to a local calendar date, returning a new {y,mo,d}. */
function addDays(y: number, mo: number, d: number, n: number): { y: number; mo: number; d: number } {
  const t = new Date(Date.UTC(y, mo - 1, d + n));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/**
 * The business day of `ref` in `tz` (default: the full calendar day that `ref`
 * falls in). Pass a `ref` of "yesterday noon" from the scheduler to report the
 * completed previous day.
 */
export function dailyPeriod(tz: string, ref: Date = new Date()): ReportPeriod {
  const { y, mo, d } = zonedParts(tz, ref);
  const start = zonedTimeToUtc(tz, y, mo, d, 0, 0);
  const next = addDays(y, mo, d, 1);
  const end = zonedTimeToUtc(tz, next.y, next.mo, next.d, 0, 0);
  const prev = addDays(y, mo, d, -1);
  const prevStart = zonedTimeToUtc(tz, prev.y, prev.mo, prev.d, 0, 0);
  return {
    type: "daily",
    startISO: start.toISOString(), endISO: end.toISOString(),
    prevStartISO: prevStart.toISOString(), prevEndISO: start.toISOString(),
    periodStart: key(y, mo, d), periodEnd: key(y, mo, d),
    label: labelDate(tz, start.toISOString()), timezone: tz,
  };
}

/**
 * The week containing `ref` in `tz`, starting on `weekStartDow` (0=Sun…6=Sat).
 */
export function weeklyPeriod(tz: string, ref: Date = new Date(), weekStartDow = 1): ReportPeriod {
  const { y, mo, d, dow } = zonedParts(tz, ref);
  const back = (dow - weekStartDow + 7) % 7;
  const ws = addDays(y, mo, d, -back);            // week start local date
  const we = addDays(ws.y, ws.mo, ws.d, 7);        // exclusive end
  const pw = addDays(ws.y, ws.mo, ws.d, -7);       // previous week start
  const start = zonedTimeToUtc(tz, ws.y, ws.mo, ws.d, 0, 0);
  const end = zonedTimeToUtc(tz, we.y, we.mo, we.d, 0, 0);
  const prevStart = zonedTimeToUtc(tz, pw.y, pw.mo, pw.d, 0, 0);
  const lastDay = addDays(we.y, we.mo, we.d, -1);
  return {
    type: "weekly",
    startISO: start.toISOString(), endISO: end.toISOString(),
    prevStartISO: prevStart.toISOString(), prevEndISO: start.toISOString(),
    periodStart: key(ws.y, ws.mo, ws.d), periodEnd: key(lastDay.y, lastDay.mo, lastDay.d),
    label: `${labelShort(tz, start.toISOString())} – ${labelDate(tz, end.toISOString() /* exclusive; label uses last day below */)}`,
    timezone: tz,
  };
}
