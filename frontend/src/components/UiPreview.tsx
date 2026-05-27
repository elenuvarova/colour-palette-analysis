import { deriveRoles } from "../lib/palette";
import type { PaletteColor } from "../types";

interface UiPreviewProps {
  colors: PaletteColor[];
}

/** Render a small mock UI in the extracted palette to show it "in action". */
export function UiPreview({ colors }: UiPreviewProps) {
  const { surface, text, accent, onAccent } = deriveRoles(colors);

  return (
    <div className="card flex flex-col gap-3 p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          In a UI
        </h3>
        <p className="text-xs text-ink-500">
          Auto-assigned roles: surface, text, and accent.
        </p>
      </div>

      <div
        className="flex flex-col gap-4 rounded-xl border p-5 sm:p-6"
        style={{ backgroundColor: surface, color: text, borderColor: `${text}22` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            New
          </span>
          <span className="text-xs font-medium opacity-60">Product update</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h4 className="text-lg font-semibold">Colours straight from your image</h4>
          <p className="text-sm opacity-70">
            This card, its text, and the buttons below are all painted with the
            palette extracted above.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            Get started
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: accent, color: accent }}
          >
            Learn more
          </button>
        </div>

        <div className="flex gap-1 pt-1">
          {colors.map((c, i) => (
            <span
              key={`${c.hex}-${i}`}
              className="h-2 flex-1 rounded-full"
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
