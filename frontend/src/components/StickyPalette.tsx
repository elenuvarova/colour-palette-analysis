import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { ALL_FORMATS, FORMAT_LABELS, contrastText, formatColor } from "../lib/formats";
import type { ColorFormat, PaletteColor } from "../types";
import { IconButton } from "./ui/IconButton";
import { Segmented } from "./ui/Segmented";

interface StickyPaletteProps {
  colors: PaletteColor[];
  format: ColorFormat;
  onFormatChange: (f: ColorFormat) => void;
  onCopy: (value: string) => void;
  /** Ref to the main PaletteGrid wrapper — when it scrolls out of view the
   *  sticky bar slides into the top of the viewport. */
  targetRef: RefObject<HTMLElement | null>;
}

/** Slim palette bar that docks at the top of the viewport once the main grid
 *  has scrolled away — keeps the palette and format toggle always reachable. */
export function StickyPalette({
  colors,
  format,
  onFormatChange,
  onCopy,
  targetRef,
}: StickyPaletteProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || colors.length === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-32px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef, colors.length]);

  if (colors.length === 0) return null;

  const total = colors.reduce((sum, c) => sum + c.percentage, 0) || 1;
  const formatOptions = ALL_FORMATS.map((f) => ({
    value: f,
    label: FORMAT_LABELS[f],
  }));

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-40 transition-[transform,opacity] duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0"
      }`}
    >
      <div className="border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <div className="flex h-7 flex-1 overflow-hidden rounded-md">
            {colors.map((c, i) => (
              <button
                key={`${c.hex}-${i}`}
                type="button"
                onClick={() => onCopy(formatColor(c, format))}
                title={`${c.hex} — ${c.percentage.toFixed(1)}% · click to copy`}
                style={{
                  backgroundColor: c.hex,
                  flexBasis: `${Math.max((c.percentage / total) * 100, 2)}%`,
                  color: contrastText(c.rgb),
                }}
                className="min-w-[10px] flex-1 transition-transform hover:scale-y-110"
              />
            ))}
          </div>
          <div className="hidden sm:block">
            <Segmented
              options={formatOptions}
              value={format}
              onChange={onFormatChange}
              ariaLabel="Colour format"
            />
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
