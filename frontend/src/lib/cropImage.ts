/** Pixel rectangle in the source image's natural coordinates. */
export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Request CORS so remote images can be drawn to (and read back from) a
    // canvas. If the server doesn't allow it the canvas is tainted and the
    // read below throws — caught by the caller as a clear error.
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not load the image for editing.")),
    );
    image.src = url;
  });
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Bounding box of an image of given size rotated by `rotation` degrees. */
function rotatedSize(width: number, height: number, rotation: number) {
  const rad = toRad(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Render the chosen crop region (after `rotation`) of `src` to a PNG Blob.
 * Throws a readable error if the canvas is tainted (cross-origin image without
 * CORS) or rendering fails.
 */
export async function getCroppedBlob(
  src: string,
  pixelCrop: PixelArea,
  rotation = 0,
): Promise<Blob> {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  const { width: boxW, height: boxH } = rotatedSize(
    image.width,
    image.height,
    rotation,
  );

  // Draw the full rotated image onto a canvas sized to its bounding box.
  canvas.width = boxW;
  canvas.height = boxH;
  ctx.translate(boxW / 2, boxH / 2);
  ctx.rotate(toRad(rotation));
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Pull out just the crop region, then resize the canvas down to it.
  let region: ImageData;
  try {
    region = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      Math.max(1, Math.round(pixelCrop.width)),
      Math.max(1, Math.round(pixelCrop.height)),
    );
  } catch {
    throw new Error(
      "This image's server blocks editing (CORS). Download it and upload the file instead.",
    );
  }

  canvas.width = region.width;
  canvas.height = region.height;
  ctx.putImageData(region, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the cropped image."));
    }, "image/png");
  });
}
