import { defineConfig } from "vitest/config";

// The unit suite under src/lib/__tests__ covers PURE functions (colour math,
// string formatting, the .ase byte writer). They need no DOM, so the lighter
// 'node' environment is used; `globals: true` lets tests use describe/it/expect
// without imports, matching common Vitest setups. DOM-dependent helpers
// (paletteToPngBlob, copyPaletteImage, downloadBlob) are intentionally not
// covered here — they require a canvas/clipboard and belong in a jsdom suite.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
