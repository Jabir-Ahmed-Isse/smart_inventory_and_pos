/** Horizontal ranked-bar list — top products / categories / customers / suppliers. */
export function RankBars({
  rows,
  emptyText = "No data yet.",
  color = "var(--color-primary, #0b7a52)",
}: {
  rows: { label: string; value: number; display: string; sub?: string }[];
  emptyText?: string;
  color?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-lg">{emptyText}</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="font-body-sm text-body-sm text-on-surface truncate">{r.label}</span>
            <span className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums shrink-0">{r.display}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: color }} />
          </div>
          {r.sub && <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
