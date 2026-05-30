import { Braces } from "lucide-react";
import { toTailwindScales } from "../lib/exports";
import { hexToRgb, readableOn, tonalScale } from "../lib/palette";
import type { PaletteColor } from "../types";
import { Button } from "./ui/Button";
import { SectionHeader } from "./ui/SectionHeader";

interface ShadesProps {
  colors: PaletteColor[];
  onCopy: (value: string, label: string) => void;
  /** Sanitised identifiers (e.g. ["primary","accent",…]) for export + labels. */
  names?: string[];
  /** Human display labels (e.g. ["Primary","Brand accent",…]); falls back to `names`. */
  displayNames?: string[];
}

/** Tailwind-style 50–950 tonal scale generated from each dominant colour. */
export function Shades({ colors, onCopy, names, displayNames }: ShadesProps) {
  return (
    <div className="card flex flex-col gap-4 p-6">
      <SectionHeader
        title="Shades"
        subtitle="A 50–950 scale per colour — a ready design-system ramp."
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={<Braces className="h-4 w-4" />}
            onClick={() =>
              onCopy(
                toTailwindScales(colors, names),
                "Tailwind colours with shades",
              )
            }
          >
            Copy Tailwind
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {colors.map((color, ci) => {
          const scale = tonalScale(color.hex);
          const rowLabel = displayNames?.[ci] || names?.[ci] || `color-${ci + 1}`;
          return (
            <div key={`${color.hex}-${ci}`} className="flex flex-col gap-1">
              <span className="font-mono text-xs text-ink-500">
                {rowLabel} · {color.hex}
              </span>
              <div className="no-scrollbar flex gap-1 overflow-x-auto">
                {scale.map((shade) => (
                  <button
                    key={shade.step}
                    type="button"
                    onClick={() => onCopy(shade.hex, shade.hex)}
                    title={`Copy ${shade.hex} (${shade.step})`}
                    style={{
                      backgroundColor: shade.hex,
                      color: readableOn(hexToRgb(shade.hex)),
                    }}
                    className="flex h-12 min-w-[44px] flex-1 flex-col items-center justify-center rounded-md text-3xs font-semibold tabular-nums transition-transform hover:scale-[1.04]"
                  >
                    {shade.step}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
