import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { nearestColorName } from "../lib/colorNames";
import { hexToRgb, hslToHex, readableOn } from "../lib/palette";
import type { PaletteColor } from "../types";

interface HarmonyProps {
  colors: PaletteColor[];
  onCopy: (value: string, label: string) => void;
}

const MAX_BASE = 3;

const SCHEMES: { name: string; offsets: number[] }[] = [
  { name: "Complementary", offsets: [180] },
  { name: "Analogous", offsets: [-30, 30] },
  { name: "Triadic", offsets: [120, 240] },
  { name: "Split-complementary", offsets: [150, 210] },
];

/** Most colourful, mid-lightness colour — a better base than the largest
 *  (usually a near-neutral background). */
function pickBaseIndex(colors: PaletteColor[]): number {
  let best = 0;
  let bestScore = -Infinity;
  colors.forEach((c, i) => {
    const [, s, l] = c.hsl;
    const lightnessFit = 1 - Math.abs(l - 55) / 55;
    const score = s * (0.5 + 0.5 * Math.max(0, lightnessFit));
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

function circularMeanHue(hues: number[]): number {
  let x = 0;
  let y = 0;
  for (const h of hues) {
    x += Math.cos((h * Math.PI) / 180);
    y += Math.sin((h * Math.PI) / 180);
  }
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Midpoint of the widest empty arc between hues — the "missing" hue. */
function largestGapMidpoint(hues: number[]): number {
  const sorted = [...hues].sort((a, b) => a - b);
  let bestGap = -1;
  let bestMid = 0;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = i === sorted.length - 1 ? sorted[0] + 360 : sorted[i + 1];
    const gap = next - cur;
    if (gap > bestGap) {
      bestGap = gap;
      bestMid = (cur + gap / 2) % 360;
    }
  }
  return bestMid;
}

interface Suggestion {
  label: string;
  hex: string;
}

export function Harmony({ colors, onCopy }: HarmonyProps) {
  const [selected, setSelected] = useState<number[]>(() => [pickBaseIndex(colors)]);

  useEffect(() => {
    setSelected([pickBaseIndex(colors)]);
  }, [colors]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      if (prev.includes(i)) {
        const next = prev.filter((x) => x !== i);
        return next.length ? next : prev; // keep at least one
      }
      if (prev.length >= MAX_BASE) return prev; // cap at 3
      return [...prev, i];
    });
  };

  const picks = (selected.length ? selected : [pickBaseIndex(colors)]).map(
    (i) => colors[i] ?? colors[0],
  );

  let suggestions: Suggestion[];
  if (picks.length === 1) {
    const [h, s, l] = picks[0].hsl;
    suggestions = SCHEMES.flatMap((scheme) =>
      scheme.offsets.map((offset, k) => ({
        label: scheme.offsets.length > 1 ? `${scheme.name} ${k + 1}` : scheme.name,
        hex: hslToHex((h + offset + 360) % 360, s, l),
      })),
    );
  } else {
    const hues = picks.map((c) => c.hsl[0]);
    const avgS = picks.reduce((sum, c) => sum + c.hsl[1], 0) / picks.length;
    const avgL = picks.reduce((sum, c) => sum + c.hsl[2], 0) / picks.length;
    const gap = largestGapMidpoint(hues);
    const mean = circularMeanHue(hues);
    suggestions = [
      { label: "Balanced", hex: hslToHex(gap, avgS, avgL) },
      { label: "Opposite", hex: hslToHex((mean + 180) % 360, avgS, avgL) },
      { label: "Vivid", hex: hslToHex(gap, Math.min(avgS + 25, 90), 52) },
    ];
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          Harmony
        </h3>
        <p className="text-xs text-ink-500">
          Pick 1–3 colours; we suggest extra colours that complete them.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-500">
          Base — one colour shows colour-wheel schemes; 2–3 suggest a completing
          colour.
        </span>
        <div className="flex flex-wrap gap-1.5">
          {colors.map((c, i) => (
            <button
              key={`${c.hex}-${i}`}
              type="button"
              onClick={() => toggle(i)}
              title={c.hex}
              aria-pressed={selected.includes(i)}
              aria-label={`Toggle ${c.hex} as a harmony base`}
              style={{ backgroundColor: c.hex }}
              className={clsx(
                "h-8 w-8 rounded-md transition",
                selected.includes(i)
                  ? "ring-2 ring-accent-500 ring-offset-2 ring-offset-ink-900"
                  : "opacity-70 hover:opacity-100",
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {suggestions.map((sug, i) => (
          <button
            key={`${sug.hex}-${i}`}
            type="button"
            onClick={() => onCopy(sug.hex, sug.hex)}
            title={`Copy ${sug.hex} — ${nearestColorName(sug.hex)}`}
            style={{ backgroundColor: sug.hex, color: readableOn(hexToRgb(sug.hex)) }}
            className="flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="truncate text-[11px] font-medium opacity-80">
              {sug.label}
            </span>
            <span className="font-mono text-xs font-semibold">{sug.hex}</span>
            <span className="truncate text-[11px] opacity-80">
              {nearestColorName(sug.hex)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
