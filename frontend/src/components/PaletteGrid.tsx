import { clsx } from "clsx";
import { useState } from "react";
import { ALL_FORMATS, FORMAT_LABELS, formatColor } from "../lib/formats";
import type { ColorFormat, PaletteColor } from "../types";
import { ColorSwatch } from "./ColorSwatch";

interface PaletteGridProps {
  colors: PaletteColor[];
  format: ColorFormat;
  onFormatChange: (format: ColorFormat) => void;
  onCopy: (value: string) => void;
}

export function PaletteGrid({
  colors,
  format,
  onFormatChange,
  onCopy,
}: PaletteGridProps) {
  // Track which swatch was most recently copied so we can flash a checkmark.
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (index: number, color: PaletteColor) => {
    onCopy(formatColor(color, format));
    setCopiedIndex(index);
    window.setTimeout(
      () => setCopiedIndex((prev) => (prev === index ? null : prev)),
      1400,
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Format toggle */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          Palette
        </h3>
        <div
          role="radiogroup"
          aria-label="Colour format"
          className="flex gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1"
        >
          {ALL_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={f === format}
              onClick={() => onFormatChange(f)}
              className={clsx(
                "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                f === format
                  ? "bg-accent-500 text-ink-950"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Proportional strip */}
      <div className="flex w-full overflow-hidden rounded-xl">
        {colors.map((color, i) => (
          <ColorSwatch
            key={`${color.hex}-${i}`}
            color={color}
            format={format}
            proportional
            justCopied={copiedIndex === i}
            onCopy={() => handleCopy(i, color)}
          />
        ))}
      </div>

      {/* Detailed grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {colors.map((color, i) => (
          <ColorSwatch
            key={`grid-${color.hex}-${i}`}
            color={color}
            format={format}
            justCopied={copiedIndex === i}
            onCopy={() => handleCopy(i, color)}
          />
        ))}
      </div>
    </div>
  );
}
