import { describe, it, expect } from "vitest";
import { nearestColorName } from "../colorNames";

describe("nearestColorName", () => {
  it("returns the exact name for an exact table match", () => {
    // distance 0 -> must pick that entry deterministically
    expect(nearestColorName("#ff0000")).toBe("Red");
    expect(nearestColorName("#000000")).toBe("Black");
    expect(nearestColorName("#ffffff")).toBe("White");
    expect(nearestColorName("#0000ff")).toBe("Blue");
    expect(nearestColorName("#008000")).toBe("Green");
  });

  it("snaps a near-match to the closest named colour", () => {
    expect(nearestColorName("#fe0101")).toBe("Red");
    expect(nearestColorName("#fefefe")).toBe("White");
    expect(nearestColorName("#010101")).toBe("Black");
  });

  it("maps the Chroma accent violet to its nearest CSS name", () => {
    // #7B6FFE [123,111,254] is closest to Medium Slate Blue #7B68EE.
    expect(nearestColorName("#7b6ffe")).toBe("Medium Slate Blue");
  });

  it("accepts 3-digit shorthand (delegated to hexToRgb)", () => {
    expect(nearestColorName("#fff")).toBe("White");
    expect(nearestColorName("#000")).toBe("Black");
  });
});
