import type { ColorFormat, PaletteColor } from "../types";

/**
 * Render a PaletteColor in the requested CSS format as a string.
 *   hex   -> "#00ACAA"
 *   rgb   -> "rgb(0, 172, 170)"
 *   hsl   -> "hsl(179, 100%, 34%)"
 *   oklch -> "oklch(0.65 0.13 196)"
 */
export function formatColor(color: PaletteColor, format: ColorFormat): string {
  switch (format) {
    case "hex":
      return color.hex.toUpperCase();
    case "rgb": {
      const [r, g, b] = color.rgb;
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
    case "hsl": {
      const [h, s, l] = color.hsl;
      return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    }
    case "oklch": {
      const [l, c, h] = color.oklch;
      return `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`;
    }
  }
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export const FORMAT_LABELS: Record<ColorFormat, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
  oklch: "OKLCH",
};

export const ALL_FORMATS: ColorFormat[] = ["hex", "rgb", "hsl", "oklch"];

/**
 * WCAG relative luminance of an sRGB triple (0..1). Used to decide whether
 * label text on a swatch should be near-black or white for best contrast.
 */
export function relativeLuminance([r, g, b]: [
  number,
  number,
  number,
]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Returns the foreground colour (near-black or white) with best contrast. */
export function contrastText(rgb: [number, number, number]): string {
  // Threshold ~0.42 biases slightly toward white text on mid-tones, which
  // reads better on saturated colours than the naive 0.5 cut-off.
  return relativeLuminance(rgb) > 0.42 ? "#15181c" : "#ffffff";
}

/** Same decision but returned as a boolean for callers that need it. */
export function isLightColor(rgb: [number, number, number]): boolean {
  return relativeLuminance(rgb) > 0.42;
}
