import { rgbToHex, simulateCvd, type CvdType } from "../lib/palette";
import type { PaletteColor } from "../types";

interface ColorBlindnessProps {
  colors: PaletteColor[];
}

const VIEWS: { key: CvdType | "normal"; label: string }[] = [
  { key: "normal", label: "Normal vision" },
  { key: "protanopia", label: "Protanopia · red-blind" },
  { key: "deuteranopia", label: "Deuteranopia · green-blind" },
  { key: "tritanopia", label: "Tritanopia · blue-blind" },
];

/** Show the palette as seen under common colour-vision deficiencies. */
export function ColorBlindness({ colors }: ColorBlindnessProps) {
  const total = colors.reduce((sum, c) => sum + c.percentage, 0) || 1;

  return (
    <div className="card flex flex-col gap-3 p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          Colour-blindness
        </h3>
        <p className="text-xs text-ink-500">
          How the palette looks to different colour-vision types — watch for
          colours that merge.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {VIEWS.map((view) => (
          <div key={view.key} className="flex flex-col gap-1">
            <span className="text-xs text-ink-500">{view.label}</span>
            <div className="flex h-8 overflow-hidden rounded-lg">
              {colors.map((c, i) => {
                const hex =
                  view.key === "normal"
                    ? c.hex
                    : rgbToHex(simulateCvd(c.rgb, view.key));
                return (
                  <div
                    key={`${view.key}-${i}`}
                    title={`${c.hex} → ${hex}`}
                    style={{
                      backgroundColor: hex,
                      flexBasis: `${Math.max((c.percentage / total) * 100, 2)}%`,
                    }}
                    className="min-w-[8px] flex-1"
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
