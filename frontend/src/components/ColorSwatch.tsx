import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { nearestColorName } from "../lib/colorNames";
import { contrastText, formatColor } from "../lib/formats";
import type { ColorFormat, PaletteColor } from "../types";

interface ColorSwatchProps {
  color: PaletteColor;
  format: ColorFormat;
  /** When true, sizes the swatch by percentage (proportional strip mode). */
  proportional?: boolean;
  onCopy: (value: string) => void;
  justCopied?: boolean;
}

export function ColorSwatch({
  color,
  format,
  proportional,
  onCopy,
  justCopied,
}: ColorSwatchProps) {
  const fg = contrastText(color.rgb);
  const value = formatColor(color, format);
  const pct = `${color.percentage.toFixed(1)}%`;
  const name = nearestColorName(color.hex);
  const a11yLabel = `Copy ${value}, ${color.percentage.toFixed(1)} percent`;

  // Proportional strip: one segment per colour, width driven by its share.
  // Text stays on a single line and truncates so narrow segments never wrap
  // or overflow; the detailed cards below show the full value.
  if (proportional) {
    return (
      <button
        type="button"
        onClick={() => onCopy(value)}
        title={`Copy ${value} — ${pct}`}
        aria-label={a11yLabel}
        style={{
          backgroundColor: color.hex,
          color: fg,
          flexBasis: `${Math.max(color.percentage, 2)}%`,
        }}
        className="group relative flex min-w-[40px] flex-1 flex-col justify-between gap-1 overflow-hidden px-2.5 py-4 text-left first:rounded-l-xl last:rounded-r-xl sm:min-w-[56px] sm:px-3"
      >
        <span className="block w-full truncate font-mono text-xs font-semibold tabular-nums sm:text-sm">
          {value}
        </span>
        <span className="block w-full truncate font-mono text-2xs tabular-nums opacity-80">
          {pct}
        </span>
      </button>
    );
  }

  // Detailed card: full value (wraps cleanly for long OKLCH strings) + share.
  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      title={`Copy ${value}`}
      aria-label={a11yLabel}
      style={{ backgroundColor: color.hex, color: fg }}
      className={clsx(
        "group relative flex flex-col justify-between gap-2 overflow-hidden rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words font-mono text-xs font-semibold tabular-nums sm:text-sm">
          {value}
        </span>
        <span
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-80"
          aria-hidden="true"
        >
          {justCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-2xs opacity-70" title={name}>
          {name}
        </span>
        <span className="shrink-0 font-mono text-2xs tabular-nums opacity-80">
          {pct}
        </span>
      </div>
    </button>
  );
}
