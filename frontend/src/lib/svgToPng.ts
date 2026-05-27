const MAX_SIDE = 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not render the SVG."));
    img.src = src;
  });
}

/** Width/height ratio from an SVG's viewBox or width/height (default 1). */
function parseAspect(svg: string): number {
  const vb = svg.match(
    /viewBox\s*=\s*["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.+-]+)\s+([\d.+-]+)/i,
  );
  if (vb) {
    const w = parseFloat(vb[1]);
    const h = parseFloat(vb[2]);
    if (w > 0 && h > 0) return w / h;
  }
  const wm = svg.match(/\bwidth\s*=\s*["']?([\d.]+)/i);
  const hm = svg.match(/\bheight\s*=\s*["']?([\d.]+)/i);
  if (wm && hm) {
    const w = parseFloat(wm[1]);
    const h = parseFloat(hm[1]);
    if (w > 0 && h > 0) return w / h;
  }
  return 1;
}

/**
 * Rasterise an uploaded SVG to a PNG File so the normal pixel-based extractor
 * can run on it (true proportions). Alpha is preserved; the backend's
 * ignore_alpha handles transparency like any other image.
 */
export async function svgToPng(file: File): Promise<File> {
  const text = await file.text();
  const aspect = parseAspect(text);
  const [w, h] =
    aspect >= 1
      ? [MAX_SIDE, Math.max(1, Math.round(MAX_SIDE / aspect))]
      : [Math.max(1, Math.round(MAX_SIDE * aspect)), MAX_SIDE];

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode the SVG."))),
        "image/png",
      );
    });
    const name = file.name.replace(/\.svg$/i, "") || "image";
    return new File([blob], `${name}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
