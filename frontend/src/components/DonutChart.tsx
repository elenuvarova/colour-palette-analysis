import { Pin } from "lucide-react";
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { PaletteColor } from "../types";

interface DonutChartProps {
  colors: PaletteColor[];
  size?: number;
  thickness?: number;
  /** Notified whenever the visually-active segment changes (hover/focus/pin). */
  onActiveChange?: (index: number | null) => void;
}

interface Segment {
  color: PaletteColor;
  index: number;
  dasharray: string;
  dashoffset: number;
}

/**
 * Pure-SVG donut. Mouse hovers a segment; keyboard cycles with arrow keys
 * (Tab to focus the donut); click or Enter pins the active segment so it
 * stays selected while you mouse elsewhere; Escape clears the pin.
 */
export function DonutChart({
  colors,
  size = 220,
  thickness = 28,
  onActiveChange,
}: DonutChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [kbd, setKbd] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  // Reset transient state when the palette changes underneath us.
  useEffect(() => {
    setHover(null);
    setKbd(null);
    setPinned(null);
  }, [colors]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Active/pinned segments grow their stroke by up to 8px, so the painted edge
  // reaches radius + (thickness + 8) / 2 = center + 4 — flush with the box at
  // the cardinal points and clipped by the SVG's default overflow: hidden. We
  // pad the viewBox AND the rendered box by the same amount so the donut keeps
  // its full diameter (1 unit = 1px) while gaining a transparent margin all
  // around. `box` is the on-screen square; geometry stays centred at `center`.
  const pad = 8;
  const box = size + pad * 2;

  const total = colors.reduce((sum, c) => sum + c.percentage, 0) || 1;

  let cumulative = 0;
  const segments: Segment[] = colors.map((color, index) => {
    const fraction = color.percentage / total;
    const length = fraction * circumference;
    const gap = length > 6 ? 1.5 : 0;
    const dasharray = `${Math.max(length - gap, 0)} ${circumference - Math.max(length - gap, 0)}`;
    const dashoffset = -cumulative * circumference;
    cumulative += fraction;
    return { color, index, dasharray, dashoffset };
  });

  const active = pinned ?? hover ?? kbd;
  const activeColor = active != null ? colors[active] : null;
  const isPinned = pinned != null;

  // Emit the active index up so PaletteGrid can highlight the matching swatch.
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  const togglePin = (i: number) => {
    setPinned((p) => (p === i ? null : i));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (colors.length === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setKbd((cur) => ((cur ?? -1) + 1) % colors.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setKbd((cur) => ((cur ?? 0) - 1 + colors.length) % colors.length);
    } else if (e.key === "Enter" || e.key === " ") {
      if (active != null) {
        e.preventDefault();
        togglePin(active);
      }
    } else if (e.key === "Escape" && pinned != null) {
      e.preventDefault();
      e.stopPropagation(); // don't bubble to App's global Esc → reset
      setPinned(null);
    }
  };

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      style={{ width: box, height: box }}
      tabIndex={0}
      role="group"
      aria-label={
        `Palette proportions donut, ${colors.length} segments. ` +
        "Arrow keys to focus, Enter to pin, Escape to clear."
      }
      onKeyDown={onKeyDown}
      onBlur={() => setKbd(null)}
    >
      <svg
        width={box}
        height={box}
        viewBox={`${-pad} ${-pad} ${box} ${box}`}
        aria-hidden="true"
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((seg) => {
            const isActive = active === seg.index;
            const isHere = pinned === seg.index;
            const stroke =
              isHere ? thickness + 8 : isActive ? thickness + 6 : thickness;
            return (
              <circle
                key={`${seg.color.hex}-${seg.index}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color.hex}
                strokeWidth={stroke}
                strokeDasharray={seg.dasharray}
                strokeDashoffset={seg.dashoffset}
                style={{
                  transition: "stroke-width 0.15s ease",
                  cursor: "pointer",
                  opacity: active == null || isActive ? 1 : 0.45,
                }}
                onMouseEnter={() => setHover(seg.index)}
                onMouseLeave={() => setHover(null)}
                onClick={() => togglePin(seg.index)}
              />
            );
          })}
        </g>
      </svg>

      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {activeColor ? (
          <>
            <span
              className="h-4 w-4 rounded-full border border-ink-700"
              style={{ backgroundColor: activeColor.hex }}
            />
            <span className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold text-ink-100">
              {activeColor.hex.toUpperCase()}
              {isPinned && active === pinned && (
                <Pin className="h-3 w-3 text-accent-400" aria-label="pinned" />
              )}
            </span>
            <span className="font-mono text-xs text-ink-400">
              {activeColor.percentage.toFixed(1)}%
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
