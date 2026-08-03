import { clsx } from "clsx";

type IconProps = {
  /** Material Symbols ligature name, e.g. "dashboard", "point_of_sale". */
  name: string;
  /** Render the filled variant (FILL 1). */
  filled?: boolean;
  className?: string;
  /** Optional explicit pixel size (matches source `text-[16px]` etc.). */
  size?: number;
};

/**
 * Thin wrapper around a Material Symbols glyph so the source markup's
 * `<span class="material-symbols-outlined">` blocks stay terse and consistent.
 */
export function Icon({ name, filled, className, size }: IconProps) {
  return (
    <span
      className={clsx("material-symbols-outlined", className)}
      style={{
        ...(size ? { fontSize: `${size}px` } : {}),
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
