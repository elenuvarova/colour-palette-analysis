import { useState } from "react";
import type { PaletteColor } from "../types";

interface DonutChartProps {
  colors: PaletteColor[];
  size?: number;
  thickness?: number;
}

interface Segment {
  color: PaletteColor;
  index: number;
  dasharray: string;
  dashoffset: number;
}

/**
 * Pure-SVG donut chart. Each colour is a stroked circle segment laid out with
 * `stroke-dasharray` / `stroke-dashoffset` around a single shared circle — no
 * charting library. Hovering a segment reveals a tooltip with hex + %.
 */
export function DonutChart({
  colors,
  size = 220,
  thickness = 28,
}: DonutChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = colors.reduce((sum, c) => sum + c.percentage, 0) || 1;

  let cumulative = 0;
  const segments: Segment[] = colors.map((color, index) => {
    const fraction = color.percentage / total;
    const length = fraction * circumference;
    // Small gap between segments for definition, except for tiny slices.
    const gap = length > 6 ? 1.5 : 0;
    const dasharray = `${Math.max(length - gap, 0)} ${circumference - Math.max(length - gap, 0)}`;
    // Offset rotates each segment to start where the previous ended.
    const dashoffset = -cumulative * circumference;
    cumulative += fraction;
    return { color, index, dasharray, dashoffset };
  });

  const active = hover != null ? colors[hover] : null;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Colour proportions donut chart"
      >
        {/* Rotate so the first segment starts at 12 o'clock. */}
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((seg) => (
            <circle
              key={`${seg.color.hex}-${seg.index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color.hex}
              strokeWidth={hover === seg.index ? thickness + 6 : thickness}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              style={{
                transition: "stroke-width 0.15s ease",
                cursor: "pointer",
                opacity: hover == null || hover === seg.index ? 1 : 0.45,
              }}
              onMouseEnter={() => setHover(seg.index)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </g>
      </svg>

      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {active ? (
          <>
            <span
              className="h-4 w-4 rounded-full border border-ink-700"
              style={{ backgroundColor: active.hex }}
            />
            <span className="mt-1 font-mono text-sm font-semibold text-ink-100">
              {active.hex.toUpperCase()}
            </span>
            <span className="font-mono text-xs text-ink-400">
              {active.percentage.toFixed(1)}%
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold text-ink-100">
              {colors.length}
            </span>
            <span className="text-xs uppercase tracking-wide text-ink-500">
              colours
            </span>
          </>
        )}
      </div>
    </div>
  );
}
