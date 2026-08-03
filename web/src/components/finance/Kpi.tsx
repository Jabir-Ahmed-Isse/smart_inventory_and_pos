import { Icon } from "@/components/Icon";

/** Enterprise KPI card — icon, label, big value, optional sub + trend. */
export function Kpi({
  label,
  value,
  icon,
  sub,
  tone = "neutral",
  trend,
}: {
  label: string;
  value: string;
  icon: string;
  sub?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
  trend?: { dir: "up" | "down"; label: string };
}) {
  const toneCls =
    tone === "positive"
      ? "text-primary bg-primary-container/20"
      : tone === "negative"
        ? "text-error bg-error-container/30"
        : tone === "warning"
          ? "text-tertiary bg-tertiary-container/20"
          : "text-on-surface-variant bg-surface-container-high";
  const valueCls = tone === "negative" ? "text-error" : "text-on-surface";

  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm flex flex-col gap-sm">
      <div className="flex items-start justify-between">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneCls}`}>
          <Icon name={icon} size={20} />
        </div>
      </div>
      <div className={`font-display-lg text-[26px] leading-none font-bold tracking-tight ${valueCls}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div className="flex items-center gap-2 min-h-[18px]">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 font-label-md text-label-md ${trend.dir === "up" ? "text-primary" : "text-error"}`}>
            <Icon name={trend.dir === "up" ? "trending_up" : "trending_down"} size={14} /> {trend.label}
          </span>
        )}
        {sub && <span className="font-label-md text-label-md text-on-surface-variant">{sub}</span>}
      </div>
    </div>
  );
}
