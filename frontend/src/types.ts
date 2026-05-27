export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";
export type ExtractMode = "fast" | "precision";

export interface PaletteColor {
  hex: string; // "#00ACAA"
  rgb: [number, number, number];
  hsl: [number, number, number];
  oklch: [number, number, number];
  percentage: number; // 0..100
  pixel_count: number;
}

export interface ExtractMeta {
  total_pixels: number;
  processed_pixels: number;
  image_size: [number, number];
  processing_ms: number;
  mode: ExtractMode;
}

export interface ExtractResponse {
  colors: PaletteColor[];
  meta: ExtractMeta;
}

export interface ExtractParams {
  limit: number;
  tolerance: number;
  mode: ExtractMode;
  ignore_alpha: boolean;
}
