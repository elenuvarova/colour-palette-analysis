import { describe, it, expect } from "vitest";
import {
  formatColor,
  relativeLuminance,
  contrastText,
  isLightColor,
  FORMAT_LABELS,
  ALL_FORMATS,
} from "../formats";
import type { PaletteColor } from "../../types";

// A representative palette entry: Chroma teal. Values are internally consistent
// enough for the formatter (which only reads the matching channel array).
const teal: PaletteColor = {
  hex: "#00acaa",
  rgb: [0, 172, 170],
  hsl: [179, 100, 33.7],
  oklch: [0.6543, 0.1287, 195.81],
  percentage: 42.5,
  pixel_count: 4250,
};

describe("formatColor", () => {
  it("hex: upper-cases the stored hex", () => {
    expect(formatColor(teal, "hex")).toBe("#00ACAA");
  });

  it("rgb: emits rounded, space-separated rgb(...) syntax", () => {
    expect(formatColor(teal, "rgb")).toBe("rgb(0, 172, 170)");
  });

  it("rgb: rounds fractional channels", () => {
    const c: PaletteColor = { ...teal, rgb: [0.4, 171.6, 170.5] };
    // 0.4 -> 0, 171.6 -> 172, 170.5 -> 171 (round-half-up)
    expect(formatColor(c, "rgb")).toBe("rgb(0, 172, 171)");
  });

  it("hsl: emits rounded percentages", () => {
    expect(formatColor(teal, "hsl")).toBe("hsl(179, 100%, 34%)");
  });

  it("oklch: keeps 3 decimals for L/C and 1 for hue", () => {
    expect(formatColor(teal, "oklch")).toBe("oklch(0.654 0.129 195.8)");
  });
});

describe("relativeLuminance", () => {
  it("is 1 for pure white and 0 for pure black", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });

  it("weights green most heavily (per WCAG coefficients)", () => {
    const green = relativeLuminance([0, 255, 0]);
    const red = relativeLuminance([255, 0, 0]);
    const blue = relativeLuminance([0, 0, 255]);
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
    expect(green).toBeCloseTo(0.7152, 4);
  });
});

describe("contrastText / isLightColor (threshold 0.42)", () => {
  it("returns dark ink on light backgrounds", () => {
    expect(contrastText([255, 255, 255])).toBe("#15181c");
    expect(isLightColor([255, 255, 255])).toBe(true);
  });

  it("returns white on dark backgrounds", () => {
    expect(contrastText([0, 0, 0])).toBe("#ffffff");
    expect(isLightColor([0, 0, 0])).toBe(false);
  });

  it("treats a luminance just above 0.42 as light (grey 180)", () => {
    // relativeLuminance([180,180,180]) ~= 0.456 -> light
    expect(relativeLuminance([180, 180, 180])).toBeGreaterThan(0.42);
    expect(isLightColor([180, 180, 180])).toBe(true);
    expect(contrastText([180, 180, 180])).toBe("#15181c");
  });

  it("treats a luminance just below 0.42 as dark (grey 128)", () => {
    // relativeLuminance([128,128,128]) ~= 0.216 -> dark
    expect(relativeLuminance([128, 128, 128])).toBeLessThan(0.42);
    expect(isLightColor([128, 128, 128])).toBe(false);
    expect(contrastText([128, 128, 128])).toBe("#ffffff");
  });
});

describe("format metadata", () => {
  it("labels every format", () => {
    expect(FORMAT_LABELS).toEqual({
      hex: "HEX",
      rgb: "RGB",
      hsl: "HSL",
      oklch: "OKLCH",
    });
  });

  it("ALL_FORMATS lists the four supported formats in order", () => {
    expect(ALL_FORMATS).toEqual(["hex", "rgb", "hsl", "oklch"]);
  });
});
