import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { nearestColorName } from "../lib/colorNames";
import {
  hexToRgb,
  oklabDistance,
  oklabToOklch,
  oklchToHex,
  readableOn,
  rgbToOklab,
  type Oklab,
} from "../lib/palette";
import type { PaletteColor } from "../types";
import { SectionHeader } from "./ui/SectionHeader";

interface HarmonyProps {
  colors: PaletteColor[];
  onCopy: (value: string, label: string) => void;
}

const MAX_BASE = 3;
// OKLab ΔE below which a suggestion is treated as a duplicate of an existing
// palette colour (or of an already-kept suggestion) and hidden.
const DUP_THRESHOLD = 0.07;
const SELF_THRESHOLD = 0.05;

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
      if (prev.length >= MAX_BASE) return prev;
      return [...prev, i];
    });
  };

  const picks = (selected.length ? selected : [pickBaseIndex(colors)]).map(
    (i) => colors[i] ?? colors[0],
  );

  // Generate candidate colours in OKLCh (perceptually even hue rotation).
  let raw: Suggestion[];
  if (picks.length === 1) {
    const [L, C, H] = oklabToOklch(rgbToOklab(picks[0].rgb));
    raw = SCHEMES.flatMap((scheme) =>
      scheme.offsets.map((offset, k) => ({
        label: scheme.offsets.length > 1 ? `${scheme.name} ${k + 1}` : scheme.name,
        hex: oklchToHex(L, C, (H + offset + 360) % 360),
      })),
    );
  } else {
    const lchs = picks.map((c) => oklabToOklch(rgbToOklab(c.rgb)));
    const avgL = lchs.reduce((sum, x) => sum + x[0], 0) / lchs.length;
    const avgC = lchs.reduce((sum, x) => sum + x[1], 0) / lchs.length;
    const hues = lchs.map((x) => x[2]);
    const gap = largestGapMidpoint(hues);
    const mean = circularMeanHue(hues);
    raw = [
      { label: "Balanced", hex: oklchToHex(avgL, avgC, gap) },
      { label: "Opposite", hex: oklchToHex(avgL, avgC, (mean + 180) % 360) },
      {
        label: "Vivid",
        hex: oklchToHex(clamp(avgL, 0.5, 0.72), clamp(avgC * 1.5, 0.13, 0.24), gap),
      },
    ];
  }

  // Hide suggestions that are perceptually too close to a palette colour or to
  // one already kept. Fall back to the raw list if everything gets filtered.
  const paletteLabs = colors.map((c) => rgbToOklab(c.rgb));
  const kept: Suggestion[] = [];
  const keptLabs: Oklab[] = [];
  for (const sug of raw) {
    const lab = rgbToOklab(hexToRgb(sug.hex));
    const dupOfPalette = paletteLabs.some((p) => oklabDistance(lab, p) < DUP_THRESHOLD);
    const dupOfKept = keptLabs.some((k) => oklabDistance(lab, k) < SELF_THRESHOLD);
    if (!dupOfPalette && !dupOfKept) {
      kept.push(sug);
      keptLabs.push(lab);
    }
  }
  const suggestions = kept.length ? kept : raw;

  return (
    <div className="card flex flex-col gap-4 p-6">
      <SectionHeader
        title="Harmony"
        subtitle="Pick 1–3 colours; we suggest extra colours that complete them (computed in OKLCh; ones you already have are hidden)."
      />

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
            <span className="truncate text-2xs font-medium opacity-80">
              {sug.label}
            </span>
            <span className="font-mono text-xs font-semibold">{sug.hex}</span>
            <span className="truncate text-2xs opacity-80">
              {nearestColorName(sug.hex)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
