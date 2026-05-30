import { useState } from "react";
import { ALL_FORMATS, FORMAT_LABELS, formatColor } from "../lib/formats";
import type { ColorFormat, PaletteColor } from "../types";
import { ColorSwatch } from "./ColorSwatch";
import { SectionHeader } from "./ui/SectionHeader";
import { Segmented } from "./ui/Segmented";

interface PaletteGridProps {
  colors: PaletteColor[];
  format: ColorFormat;
  onFormatChange: (format: ColorFormat) => void;
  onCopy: (value: string) => void;
  /** Index of the colour currently active in the donut (hover/focus/pin). */
  activeIndex?: number | null;
}

export function PaletteGrid({
  colors,
  format,
  onFormatChange,
  onCopy,
  activeIndex,
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

  const formatOptions = ALL_FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] }));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Palette"
        action={
          <Segmented
            options={formatOptions}
            value={format}
            onChange={onFormatChange}
            ariaLabel="Colour format"
          />
        }
      />

      {/* Proportional strip */}
      <div className="flex w-full overflow-hidden rounded-xl">
        {colors.map((color, i) => (
          <ColorSwatch
            key={`${color.hex}-${i}`}
            color={color}
            format={format}
            proportional
            justCopied={copiedIndex === i}
            active={activeIndex === i}
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
            active={activeIndex === i}
            onCopy={() => handleCopy(i, color)}
          />
        ))}
      </div>
    </div>
  );
}
