"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";

export type PeriodKey = "today" | "7d" | "30d" | "month" | "custom";

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom range" },
];

/**
 * Dashboard date-range picker. Writes the choice to the URL (?period=… &from=…
 * &to=…) so the server re-renders the metrics for that range. Presets plus a
 * custom from/to range.
 */
export function PeriodSelector({
  period,
  from,
  to,
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [cFrom, setCFrom] = useState(from ?? "");
  const [cTo, setCTo] = useState(to ?? "");

  const current = PRESETS.find((p) => p.key === period) ?? PRESETS[0];

  function apply(next: Partial<{ period: PeriodKey; from: string; to: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.period) params.set("period", next.period);
    if (next.period && next.period !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    if (next.from !== undefined) next.from ? params.set("from", next.from) : params.delete("from");
    if (next.to !== undefined) next.to ? params.set("to", next.to) : params.delete("to");
    start(() => router.push(`/dashboard?${params.toString()}`, { scroll: false }));
  }

  function pick(key: PeriodKey) {
    if (key === "custom") return; // custom applied via the date inputs
    setOpen(false);
    apply({ period: key });
  }

  function applyCustom() {
    if (!cFrom || !cTo) return;
    setOpen(false);
    apply({ period: "custom", from: cFrom, to: cTo });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-sm px-md py-sm border border-outline-variant rounded-md font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-60"
      >
        <Icon name={pending ? "hourglass_empty" : "calendar_today"} size={16} />
        {period === "custom" && from && to ? `${from} → ${to}` : current.label}
        <Icon name="expand_more" size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-1 z-50 w-64 bg-surface border border-outline-variant rounded-xl shadow-lg p-2">
            <ul className="flex flex-col">
              {PRESETS.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => pick(p.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-body-sm font-body-sm flex items-center justify-between hover:bg-surface-container-high transition-colors ${
                      period === p.key ? "text-primary font-semibold" : "text-on-surface"
                    }`}
                  >
                    {p.label}
                    {period === p.key && <Icon name="check" size={16} className="text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 pt-2 border-t border-outline-variant">
              <p className="text-[11px] text-on-surface-variant px-1 mb-1 uppercase tracking-wide">Custom range</p>
              <div className="flex flex-col gap-2 px-1">
                <label className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                  From
                  <input type="date" value={cFrom} max={cTo || undefined} onChange={(e) => setCFrom(e.target.value)} className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-md px-2 py-1 text-xs text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent" />
                </label>
                <label className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                  To
                  <input type="date" value={cTo} min={cFrom || undefined} onChange={(e) => setCTo(e.target.value)} className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-md px-2 py-1 text-xs text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent" />
                </label>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!cFrom || !cTo}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Apply range
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
