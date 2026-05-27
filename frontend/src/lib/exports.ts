import type { PaletteColor } from "../types";

/** Build "--color-1: #00ACAA;" CSS custom-property declarations. */
export function toCssVariables(colors: PaletteColor[]): string {
  const lines = colors.map(
    (c, i) => `  --color-${i + 1}: ${c.hex.toUpperCase()};`,
  );
  return `:root {\n${lines.join("\n")}\n}`;
}

/** Build a `theme.extend.colors` fragment for tailwind.config.js. */
export function toTailwindConfig(colors: PaletteColor[]): string {
  const entries = colors.map(
    (c, i) => `        'palette-${i + 1}': '${c.hex.toUpperCase()}',`,
  );
  return [
    "theme: {",
    "  extend: {",
    "    colors: {",
    ...entries,
    "    },",
    "  },",
    "},",
  ].join("\n");
}

/** Serialise the full palette payload to pretty JSON. */
export function toJsonString(colors: PaletteColor[]): string {
  return JSON.stringify(
    {
      colors: colors.map((c) => ({
        hex: c.hex.toUpperCase(),
        rgb: c.rgb,
        hsl: c.hsl,
        oklch: c.oklch,
        percentage: c.percentage,
        pixel_count: c.pixel_count,
      })),
    },
    null,
    2,
  );
}

/** Trigger a browser download for an arbitrary Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(
  text: string,
  filename: string,
  mime = "text/plain",
): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

/**
 * Render the palette to a PNG via an offscreen <canvas>. Each colour gets a
 * horizontal band whose width is proportional to its percentage, with the hex
 * value drawn in auto-contrast text.
 */
export function paletteToPngBlob(
  colors: PaletteColor[],
  opts: { width?: number; height?: number } = {},
): Promise<Blob> {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 320;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas 2D context unavailable."));
  }

  const total = colors.reduce((sum, c) => sum + c.percentage, 0) || 1;
  let x = 0;
  ctx.textBaseline = "alphabetic";
  ctx.font =
    "600 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  colors.forEach((c) => {
    const w = (c.percentage / total) * width;
    ctx.fillStyle = c.hex;
    ctx.fillRect(Math.round(x), 0, Math.ceil(w) + 1, height);

    // Only draw the label if the band is wide enough to fit text.
    if (w > 64) {
      const lum = relativeLuminanceFromRgb(c.rgb);
      ctx.fillStyle = lum > 0.42 ? "#15181c" : "#ffffff";
      const label = c.hex.toUpperCase();
      const pct = `${c.percentage.toFixed(1)}%`;
      ctx.fillText(label, x + 16, height - 44);
      ctx.font =
        "400 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillText(pct, x + 16, height - 22);
      ctx.font =
        "600 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    }
    x += w;
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode PNG."));
    }, "image/png");
  });
}

function relativeLuminanceFromRgb([r, g, b]: [
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

/**
 * Minimal Adobe Swatch Exchange (.ase) writer.
 *
 * Format reference (big-endian throughout):
 *   - File signature: "ASEF" (4 bytes)
 *   - Version: u16 major (1), u16 minor (0)
 *   - Block count: u32
 *   - Then `count` blocks. Each block:
 *       u16 type, u32 length (of the payload that follows), payload
 *
 *   Group-start block (type 0xC001):
 *       u16 nameLen (incl. trailing NUL), UTF-16BE name (NUL-terminated)
 *   Colour block (type 0x0001):
 *       u16 nameLen (incl. NUL), UTF-16BE name (NUL-terminated),
 *       4-byte ASCII colour model ("RGB "), model values, u16 colour type
 *   Group-end block (type 0xC002): empty payload
 *
 * LIMITATION: only the RGB colour model is emitted (each channel as a 32-bit
 * float in 0..1). CMYK/LAB/Gray models and named swatch metadata beyond the
 * swatch name are intentionally omitted. This produces a valid RGB .ase that
 * imports cleanly into Photoshop/Illustrator. Colour type is "global" (0).
 */
export function paletteToAse(
  colors: PaletteColor[],
  groupName = "colour-palette-analysis",
): Blob {
  const chunks: Uint8Array[] = [];

  // --- Header ---
  chunks.push(ascii("ASEF"));
  chunks.push(u16(1)); // version major
  chunks.push(u16(0)); // version minor
  // block count: group-start + N colours + group-end
  chunks.push(u32(colors.length + 2));

  // --- Group start block ---
  chunks.push(...groupStartBlock(groupName));

  // --- Colour blocks ---
  colors.forEach((c, i) => {
    chunks.push(...colorBlock(`Color ${i + 1}`, c.rgb));
  });

  // --- Group end block ---
  chunks.push(u16(0xc002));
  chunks.push(u32(0)); // empty payload

  return new Blob([concat(chunks).buffer as ArrayBuffer], {
    type: "application/octet-stream",
  });
}

function groupStartBlock(name: string): Uint8Array[] {
  const namePayload = utf16beName(name);
  const payloadLen = namePayload.length;
  return [u16(0xc001), u32(payloadLen), namePayload];
}

function colorBlock(name: string, rgb: [number, number, number]): Uint8Array[] {
  const namePayload = utf16beName(name);
  const model = ascii("RGB "); // 4 ASCII bytes, space-padded
  const values = concat([
    f32(rgb[0] / 255),
    f32(rgb[1] / 255),
    f32(rgb[2] / 255),
  ]);
  const colorType = u16(0); // 0 = global, 1 = spot, 2 = normal
  const payload = concat([namePayload, model, values, colorType]);
  return [u16(0x0001), u32(payload.length), payload];
}

// --- byte helpers (all big-endian) ---

function ascii(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** UTF-16BE name preceded by a u16 length that INCLUDES the trailing NUL. */
function utf16beName(name: string): Uint8Array {
  const chars = name.length + 1; // + trailing NUL
  const buf = new Uint8Array(2 + chars * 2);
  const dv = new DataView(buf.buffer);
  dv.setUint16(0, chars, false);
  for (let i = 0; i < name.length; i++) {
    dv.setUint16(2 + i * 2, name.charCodeAt(i), false);
  }
  // trailing NUL is already 0 from Uint8Array initialisation
  return buf;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, false);
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, false);
  return b;
}

function f32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setFloat32(0, n, false);
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
