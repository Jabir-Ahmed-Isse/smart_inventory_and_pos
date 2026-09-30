import Link from "next/link";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Per-company brand mark for the sidebar: the organization's own uploaded logo,
 * or a gradient badge with its initials when none is set. Shows the company name
 * as the wordmark. Links to the dashboard; theme-aware.
 */
export function Logo({
  name = "Workspace",
  logoUrl = null,
  tagline = null,
}: {
  name?: string;
  logoUrl?: string | null;
  /** Editable per-company slogan under the name. Falls back to a default. */
  tagline?: string | null;
}) {
  const sub = (tagline && tagline.trim()) || "Inventory Pro";
  return (
    <Link href="/dashboard" className="group flex items-center gap-3 min-w-0" aria-label={`${name} — go to dashboard`}>
      <span className="relative shrink-0">
        {logoUrl ? (
          <span className="block w-[42px] h-[42px] rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-sm transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={`${name} logo`} className="w-full h-full object-contain" />
          </span>
        ) : (
          <span
            className="flex w-[42px] h-[42px] rounded-xl items-center justify-center text-white font-bold text-[16px] tracking-tight shadow-sm transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
            style={{ backgroundImage: "linear-gradient(135deg,#12B981,#006C49)" }}
          >
            {initials(name)}
          </span>
        )}
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#5EEAD4] ring-2 ring-surface shadow-sm" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#5EEAD4] animate-ping opacity-60" />
      </span>
      <span className="leading-tight min-w-0">
        <span className="block font-bold tracking-tight text-[18px] text-on-surface truncate max-w-[168px]">{name}</span>
        <span className="block font-label-md text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant/70 truncate max-w-[168px]">
          {sub}
        </span>
      </span>
    </Link>
  );
}
