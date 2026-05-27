import { contrastGrade, contrastRatio } from "../lib/palette";
import type { PaletteColor } from "../types";

interface ContrastMatrixProps {
  colors: PaletteColor[];
}

const GRADE_DOT: Record<string, string> = {
  AAA: "●●●",
  AA: "●●",
  "AA Large": "●",
  Fail: "—",
};

/**
 * WCAG contrast matrix: text colour (rows) on background colour (columns).
 * Each cell renders the real pair so legibility is visible, with the ratio
 * and an AA/AAA grade.
 */
export function ContrastMatrix({ colors }: ContrastMatrixProps) {
  const cell = 60;
  const template = `${cell}px repeat(${colors.length}, minmax(${cell}px, 1fr))`;

  return (
    <div className="card flex flex-col gap-3 p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          Contrast
        </h3>
        <p className="text-xs text-ink-500">
          Text (row) on background (column). Ratio + WCAG grade; ● = AA Large,
          ●● = AA, ●●● = AAA.
        </p>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: template, minWidth: "min-content" }}
        >
          {/* Header row */}
          <div />
          {colors.map((c, i) => (
            <div
              key={`h-${i}`}
              className="h-6 rounded-md border border-ink-700"
              style={{ backgroundColor: c.hex }}
              title={`bg ${c.hex}`}
            />
          ))}

          {/* Rows */}
          {colors.map((row, ri) => (
            <Row key={`r-${ri}`} row={row} colors={colors} ri={ri} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  row,
  colors,
  ri,
}: {
  row: PaletteColor;
  colors: PaletteColor[];
  ri: number;
}) {
  return (
    <>
      <div
        className="w-6 rounded-md border border-ink-700"
        style={{ backgroundColor: row.hex }}
        title={`text ${row.hex}`}
      />
      {colors.map((col, ci) => {
        if (ci === ri) {
          return (
            <div
              key={ci}
              className="grid h-14 place-items-center rounded-md text-ink-600"
            >
              —
            </div>
          );
        }
        const ratio = contrastRatio(row.rgb, col.rgb);
        const grade = contrastGrade(ratio);
        return (
          <div
            key={ci}
            className="grid h-14 place-items-center rounded-md"
            style={{ backgroundColor: col.hex, color: row.hex }}
            title={`${row.hex} on ${col.hex} — ${ratio.toFixed(2)}:1 (${grade})`}
          >
            <span className="font-mono text-sm font-semibold tabular-nums">
              {ratio.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] leading-none opacity-90">
              {GRADE_DOT[grade]}
            </span>
          </div>
        );
      })}
    </>
  );
}
