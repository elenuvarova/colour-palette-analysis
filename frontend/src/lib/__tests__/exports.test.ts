import { describe, it, expect } from "vitest";
import { sanitizeName, toJsonString, paletteToAse } from "../exports";
import type { PaletteColor } from "../../types";

function makeColor(over: Partial<PaletteColor> = {}): PaletteColor {
  return {
    hex: "#ff0000",
    rgb: [255, 0, 0],
    hsl: [0, 100, 50],
    oklch: [0.628, 0.2577, 29.23],
    percentage: 50,
    pixel_count: 5000,
    ...over,
  };
}

async function aseBytes(colors: PaletteColor[], groupName?: string) {
  const blob = groupName
    ? paletteToAse(colors, undefined, groupName)
    : paletteToAse(colors);
  const buf = await blob.arrayBuffer();
  return new DataView(buf);
}

describe("sanitizeName", () => {
  it("lower-cases, trims, and dash-joins non-alphanumerics", () => {
    expect(sanitizeName("  Brand Accent!  ")).toBe("brand-accent");
  });

  it("collapses runs of separators into a single dash", () => {
    expect(sanitizeName("foo___bar  baz")).toBe("foo-bar-baz");
  });

  it("strips leading and trailing dashes", () => {
    expect(sanitizeName("--Hello--")).toBe("hello");
    expect(sanitizeName("***")).toBe("");
  });

  it("keeps digits", () => {
    expect(sanitizeName("Color 500")).toBe("color-500");
  });
});

describe("toJsonString", () => {
  it("emits the documented per-colour shape with upper-cased hex", () => {
    const json = toJsonString([
      makeColor({ hex: "#00acaa", rgb: [0, 172, 170], percentage: 42.5 }),
    ]);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({
      colors: [
        {
          name: "Color 1",
          hex: "#00ACAA",
          rgb: [0, 172, 170],
          hsl: [0, 100, 50],
          oklch: [0.628, 0.2577, 29.23],
          percentage: 42.5,
          pixel_count: 5000,
        },
      ],
    });
  });

  it("is pretty-printed with two-space indentation", () => {
    const json = toJsonString([makeColor()]);
    expect(json).toContain('\n  "colors": [');
  });

  it("serialises an empty palette to an empty colors array", () => {
    expect(JSON.parse(toJsonString([]))).toEqual({ colors: [] });
  });
});

describe("paletteToAse (byte-exact ASEF writer)", () => {
  it("writes the ASEF signature and version 1.0 header", async () => {
    const dv = await aseBytes([makeColor()]);
    // "ASEF"
    expect(dv.getUint8(0)).toBe(0x41);
    expect(dv.getUint8(1)).toBe(0x53);
    expect(dv.getUint8(2)).toBe(0x45);
    expect(dv.getUint8(3)).toBe(0x46);
    // version major 1, minor 0 (big-endian u16 each)
    expect(dv.getUint16(4, false)).toBe(1);
    expect(dv.getUint16(6, false)).toBe(0);
  });

  it("declares block count = colours + 2 (group start + end)", async () => {
    const dv2 = await aseBytes([makeColor(), makeColor()]);
    expect(dv2.getUint32(8, false)).toBe(4); // 2 colours + 2
    const dv3 = await aseBytes([makeColor(), makeColor(), makeColor()]);
    expect(dv3.getUint32(8, false)).toBe(5); // 3 colours + 2
  });

  it("emits a group-start block (0xC001) with a NUL-terminated UTF-16BE name", async () => {
    const dv = await aseBytes([makeColor()], "G");
    let off = 12; // after 12-byte header
    expect(dv.getUint16(off, false)).toBe(0xc001); // block type
    off += 2;
    const payloadLen = dv.getUint32(off, false);
    off += 4;
    // payload: u16 charCount (incl. NUL) + UTF-16BE chars + NUL
    const charCount = dv.getUint16(off, false);
    expect(charCount).toBe(2); // "G" + NUL
    expect(payloadLen).toBe(2 + charCount * 2); // 2 + 4 = 6
    off += 2;
    expect(dv.getUint16(off, false)).toBe("G".charCodeAt(0)); // 0x47
    off += 2;
    expect(dv.getUint16(off, false)).toBe(0); // trailing NUL
  });

  it("emits a colour block (0x0001) named 'Color N' in the RGB model with float channels", async () => {
    // group name "G" (payload 6 bytes) keeps offsets easy to follow.
    const dv = await aseBytes([makeColor({ rgb: [255, 0, 0] })], "G");
    // header(12) + groupStart block: type(2)+len(4)+payload(6) = 12 -> colour at 24
    let off = 24;
    expect(dv.getUint16(off, false)).toBe(0x0001); // colour block type
    off += 2;
    const payloadLen = dv.getUint32(off, false);
    off += 4;
    const payloadStart = off;

    // name "Color 1" -> charCount 8 (7 + NUL)
    const charCount = dv.getUint16(off, false);
    expect(charCount).toBe(8);
    off += 2;
    let name = "";
    for (let i = 0; i < charCount - 1; i++) {
      name += String.fromCharCode(dv.getUint16(off, false));
      off += 2;
    }
    expect(name).toBe("Color 1");
    expect(dv.getUint16(off, false)).toBe(0); // NUL terminator
    off += 2;

    // colour model "RGB " (4 ASCII bytes, space-padded)
    const model = String.fromCharCode(
      dv.getUint8(off),
      dv.getUint8(off + 1),
      dv.getUint8(off + 2),
      dv.getUint8(off + 3),
    );
    expect(model).toBe("RGB ");
    off += 4;

    // three big-endian float32 channels in 0..1
    expect(dv.getFloat32(off, false)).toBeCloseTo(1, 6); // R 255/255
    expect(dv.getFloat32(off + 4, false)).toBeCloseTo(0, 6); // G
    expect(dv.getFloat32(off + 8, false)).toBeCloseTo(0, 6); // B
    off += 12;

    // colour type u16 = 0 (global)
    expect(dv.getUint16(off, false)).toBe(0);
    off += 2;

    // declared payload length must match what we consumed
    expect(off - payloadStart).toBe(payloadLen);
    expect(payloadLen).toBe(18 + 4 + 12 + 2); // name + model + values + type
  });

  it("terminates with a group-end block (0xC002) and empty payload", async () => {
    const dv = await aseBytes([makeColor()], "G");
    const total = dv.byteLength;
    // last 6 bytes: type(2) + length(4)
    expect(dv.getUint16(total - 6, false)).toBe(0xc002);
    expect(dv.getUint32(total - 4, false)).toBe(0);
  });

  it("defaults the group name when none is supplied", async () => {
    const dv = await aseBytes([makeColor()]);
    // group-start payload length encodes ("Chroma" + NUL)
    const expectedChars = "Chroma".length + 1;
    expect(dv.getUint16(12, false)).toBe(0xc001);
    expect(dv.getUint32(14, false)).toBe(2 + expectedChars * 2);
  });
});
