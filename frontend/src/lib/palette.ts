import type { PaletteColor } from "../types";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(h, s, l));
}

// Tailwind-like 11-step ramp.
export const SCALE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;
const SCALE_L = [97, 94, 87, 78, 67, 57, 48, 39, 31, 23, 15];

export interface Shade {
  step: number;
  hex: string;
}

/** Build a 50–950 tonal scale anchored on the colour's hue/saturation. */
export function tonalScale(hex: string): Shade[] {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  return SCALE_STEPS.map((step, i) => {
    const l = SCALE_L[i];
    // Damp saturation at the extremes so the lightest/darkest steps aren't neon.
    const sat = Math.min(s * (l > 90 || l < 20 ? 0.9 : 1), 100);
    return { step, hex: hslToHex(h, sat, l) };
  });
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const ch = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastGrade = "AAA" | "AA" | "AA Large" | "Fail";

export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/** Black or white — whichever is more legible on `rgb`. */
export function readableOn(rgb: Rgb): "#000000" | "#FFFFFF" {
  return contrastRatio(rgb, [0, 0, 0]) >= contrastRatio(rgb, [255, 255, 255])
    ? "#000000"
    : "#FFFFFF";
}

export interface UiRoles {
  surface: string;
  text: string;
  accent: string;
  onAccent: string;
}

/** Assign UI roles (surface/text/accent) from a palette for the live preview. */
export function deriveRoles(colors: PaletteColor[]): UiRoles {
  const lightest = colors.reduce((a, c) =>
    relativeLuminance(c.rgb) > relativeLuminance(a.rgb) ? c : a,
  );
  const darkest = colors.reduce((a, c) =>
    relativeLuminance(c.rgb) < relativeLuminance(a.rgb) ? c : a,
  );
  const text =
    contrastRatio(darkest.rgb, lightest.rgb) >= 4.5
      ? darkest.hex
      : readableOn(lightest.rgb);
  const accent = colors
    .filter((c) => c.hex !== lightest.hex)
    .reduce((best, c) => (c.hsl[1] > best.hsl[1] ? c : best), darkest);
  return {
    surface: lightest.hex,
    text,
    accent: accent.hex,
    onAccent: readableOn(accent.rgb),
  };
}
