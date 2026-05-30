import { useState } from "react";
import {
  contrastGrade,
  contrastRatio,
  type ContrastGrade,
} from "../lib/palette";
import type { PaletteColor } from "../types";
import { SectionHeader } from "./ui/SectionHeader";
import { Segmented } from "./ui/Segmented";

interface ContrastMatrixProps {
  colors: PaletteColor[];
  onCopy: (value: string, label: string) => void;
}

type Filter = "all" | "aa" | "aaa";

const GRADE_DOT: Record<ContrastGrade, string> = {
  AAA: "●●●",
  AA: "●●",
  "AA Large": "●",
  Fail: "—",
};

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "aa", label: "AA+" },
  { value: "aaa", label: "AAA" },
];

const PASSES: Record<Filter, (g: ContrastGrade) => boolean> = {
  all: () => true,
  aa: (g) => g === "AAA" || g === "AA",
  aaa: (g) => g === "AAA",
};

/**
 * WCAG contrast matrix: text colour (rows) on background colour (columns).
 * Each cell renders the real pair so legibility is visible, with the ratio
 * and an AA/AAA grade. Click a cell to copy a `color: …; background: …;` pair.
 */
export function ContrastMatrix({ colors, onCopy }: ContrastMatrixProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const cell = 60;
  const template = `${cell}px repeat(${colors.length}, minmax(${cell}px, 1fr))`;
  const passes = PASSES[filter];

  return (
    <div className="card flex flex-col gap-3 p-6">
      <SectionHeader
        title="Contrast"
        subtitle="Text (row) on background (column). Click a cell to copy the pair as CSS. ● = AA Large, ●● = AA, ●●● = AAA."
        action={
          <Segmented
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
            ariaLabel="Contrast filter"
          />
        }
      />

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
            <Row
              key={`r-${ri}`}
              row={row}
              colors={colors}
              ri={ri}
              passes={passes}
              onCopy={onCopy}
            />
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
  passes,
  onCopy,
}: {
  row: PaletteColor;
  colors: PaletteColor[];
  ri: number;
  passes: (g: ContrastGrade) => boolean;
  onCopy: (value: string, label: string) => void;
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
        const ok = passes(grade);
        const css = `color: ${row.hex.toUpperCase()}; background: ${col.hex.toUpperCase()};`;
        return (
          <button
            key={ci}
            type="button"
            className="grid h-14 place-items-center rounded-md transition-opacity hover:opacity-95"
            style={{
              backgroundColor: col.hex,
              color: row.hex,
              opacity: ok ? 1 : 0.28,
            }}
            title={`${row.hex} on ${col.hex} — ${ratio.toFixed(2)}:1 (${grade}). Click to copy CSS.`}
            onClick={() => onCopy(css, `${row.hex.toUpperCase()} on ${col.hex.toUpperCase()}`)}
          >
            <span className="font-mono text-sm font-semibold tabular-nums">
              {ratio.toFixed(1)}
            </span>
            <span className="font-mono text-3xs leading-none opacity-90">
              {GRADE_DOT[grade]}
            </span>
          </button>
        );
      })}
    </>
  );
}
