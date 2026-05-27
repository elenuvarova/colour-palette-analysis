import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
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

  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      title={`Copy ${value}`}
      aria-label={`Copy ${value}, ${color.percentage.toFixed(1)} percent`}
      style={{
        backgroundColor: color.hex,
        color: fg,
        // In proportional mode, flex-basis is driven by the colour's share.
        flexBasis: proportional ? `${Math.max(color.percentage, 2)}%` : undefined,
      }}
      className={clsx(
        "group relative flex flex-col justify-between overflow-hidden text-left transition-transform",
        proportional
          ? "min-w-[68px] flex-1 px-3 py-4 first:rounded-l-xl last:rounded-r-xl sm:min-w-[88px]"
          : "rounded-xl p-4 hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold tabular-nums sm:text-sm">
          {value}
        </span>
        <span
          className="opacity-0 transition-opacity group-hover:opacity-80"
          aria-hidden="true"
        >
          {justCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <span className="font-mono text-[11px] tabular-nums opacity-80">
        {color.percentage.toFixed(1)}%
      </span>
    </button>
  );
}
