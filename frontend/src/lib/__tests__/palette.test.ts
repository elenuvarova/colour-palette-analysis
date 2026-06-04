import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  relativeLuminance,
  contrastRatio,
  contrastGrade,
  readableOn,
} from "../palette";

describe("hexToRgb", () => {
  it("parses 6-digit hex", () => {
    expect(hexToRgb("#00ACAA")).toEqual([0, 172, 170]);
  });

  it("expands 3-digit shorthand (#fff -> #ffffff)", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#abc")).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it("tolerates a missing leading '#'", () => {
    expect(hexToRgb("000000")).toEqual([0, 0, 0]);
  });
});

describe("rgbToHex", () => {
  it("formats as upper-case 6-digit hex with zero padding", () => {
    expect(rgbToHex([0, 172, 170])).toBe("#00ACAA");
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
  });

  it("rounds and clamps out-of-range channels", () => {
    expect(rgbToHex([-5, 300, 127.6])).toBe("#00FF80");
  });

  it("round-trips hex -> rgb -> hex", () => {
    for (const hex of ["#00ACAA", "#FF0000", "#123456", "#FFFFFF"]) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });
});

describe("rgbToHsl / hslToRgb", () => {
  it("converts pure red to HSL", () => {
    expect(rgbToHsl([255, 0, 0])).toEqual([0, 100, 50]);
  });

  it("reports zero saturation for greys", () => {
    const [h, s, l] = rgbToHsl([128, 128, 128]);
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBeCloseTo(50.2, 1);
  });

  it("hslToRgb inverts rgbToHsl for primaries", () => {
    expect(hslToRgb(0, 100, 50).map(Math.round)).toEqual([255, 0, 0]);
    expect(hslToRgb(120, 100, 50).map(Math.round)).toEqual([0, 255, 0]);
    expect(hslToRgb(240, 100, 50).map(Math.round)).toEqual([0, 0, 255]);
  });

  it("hslToHex composes the two conversions", () => {
    expect(hslToHex(0, 100, 50)).toBe("#FF0000");
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white (the WCAG maximum)", () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
  });

  it("is 1:1 for identical colours", () => {
    expect(contrastRatio([123, 45, 67], [123, 45, 67])).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a: [number, number, number] = [10, 20, 30];
    const b: [number, number, number] = [200, 210, 220];
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it("matches the relativeLuminance-based definition", () => {
    const a: [number, number, number] = [123, 45, 67];
    const b: [number, number, number] = [0, 0, 0];
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const expected = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    expect(contrastRatio(a, b)).toBeCloseTo(expected, 10);
  });
});

describe("contrastGrade boundaries (3:1 / 4.5:1 / 7:1)", () => {
  it("grades >= 7 as AAA, just below as AA", () => {
    expect(contrastGrade(7)).toBe("AAA");
    expect(contrastGrade(6.999)).toBe("AA");
  });

  it("grades >= 4.5 as AA, just below as AA Large", () => {
    expect(contrastGrade(4.5)).toBe("AA");
    expect(contrastGrade(4.499)).toBe("AA Large");
  });

  it("grades >= 3 as AA Large, just below as Fail", () => {
    expect(contrastGrade(3)).toBe("AA Large");
    expect(contrastGrade(2.999)).toBe("Fail");
  });

  it("grades 1:1 as Fail", () => {
    expect(contrastGrade(1)).toBe("Fail");
  });
});

describe("readableOn (black vs white foreground)", () => {
  it("prefers black ink on light backgrounds", () => {
    expect(readableOn([255, 255, 255])).toBe("#000000");
    expect(readableOn([240, 240, 240])).toBe("#000000");
  });

  it("prefers white ink on dark backgrounds", () => {
    expect(readableOn([0, 0, 0])).toBe("#FFFFFF");
    expect(readableOn([20, 20, 30])).toBe("#FFFFFF");
  });
});
