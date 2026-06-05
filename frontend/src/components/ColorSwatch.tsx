import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { nearestColorName } from "../lib/colorNames";
import { contrastText, formatColor } from "../lib/formats";
import type { ColorFormat, PaletteColor } from "../types";

interface ColorSwatchProps {
  color: PaletteColor;
  format: ColorFormat;
  /** When true, sizes the swatch by percentage (proportional strip mode). */
  proportional?: boolean;
  /** Mirror highlight from the donut (focus/hover/pin). */
  active?: boolean;
  /** Index in the palette — used to stagger the proportional-strip reveal. */
  index?: number;
  /** User-given name (card variant). When set, replaces the auto colour name. */
  customName?: string;
  /** Notified when the user renames the colour (card variant only). */
  onNameChange?: (name: string) => void;
  onCopy: (value: string) => void;
  justCopied?: boolean;
}

const REVEAL_STAGGER_MS = 40;

export function ColorSwatch({
  color,
  format,
  proportional,
  active,
  index = 0,
  customName,
  onNameChange,
  onCopy,
  justCopied,
}: ColorSwatchProps) {
  const fg = contrastText(color.rgb);
  const value = formatColor(color, format);
  const pct = `${color.percentage.toFixed(1)}%`;
  const autoName = nearestColorName(color.hex);
  const displayName = customName?.trim() || autoName;
  const a11yLabel = `Copy ${value}, ${color.percentage.toFixed(1)} percent`;

  // Inline-rename state for the card variant.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(customName ?? "");
  useEffect(() => {
    if (!editing) setDraft(customName ?? "");
  }, [customName, editing]);

  const commitName = () => {
    onNameChange?.(draft.trim());
    setEditing(false);
  };
  const cancelEdit = () => {
    setDraft(customName ?? "");
    setEditing(false);
  };

  // Reveal animation for the proportional strip: start at 0 width on first
  // mount, transition to the real share with a per-index stagger so the strip
  // "grows in" as the palette lands. Hooks live at the top level (called on
  // every render) regardless of which branch we render below.
  const targetBasis = `${Math.max(color.percentage, 2)}%`;
  const [basis, setBasis] = useState(proportional ? "0%" : targetBasis);
  useEffect(() => {
    if (!proportional) return;
    const id = window.setTimeout(() => setBasis(targetBasis), index * REVEAL_STAGGER_MS);
    return () => window.clearTimeout(id);
    // Re-trigger only when the swatch's identity changes (its key remounts it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proportional strip: one colour segment per colour, width driven by its
  // share. A floating label (hex + share) appears on hover AND focus — the
  // latter so touch/keyboard users get it too (the old native `title` was
  // invisible on touch). The label can overflow narrow slivers, so it sits in
  // an overflow-visible segment with its own background chip.
  if (proportional) {
    return (
      <button
        type="button"
        onClick={() => onCopy(value)}
        aria-label={a11yLabel}
        style={{
          backgroundColor: color.hex,
          flexBasis: basis,
          transition: "flex-basis 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
          outline: active ? `2px solid ${fg}` : undefined,
          outlineOffset: active ? "-3px" : undefined,
        }}
        className="group relative h-16 min-w-[40px] flex-1 first:rounded-l-lg last:rounded-r-lg focus:z-10 focus-visible:z-10 sm:min-w-[56px]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-2xs text-ink-100 opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {value} · {pct}
        </span>
      </button>
    );
  }

  // Detailed card: a non-interactive coloured container with two real,
  // sibling controls — a Copy button (the whole top row) and a rename button.
  // Previously the card was a div[role=button] with a nested <button>, which is
  // invalid interactive nesting; this keeps each control independently
  // focusable and labelled.
  return (
    <div
      style={{
        backgroundColor: color.hex,
        color: fg,
        outline: active ? `2px solid ${fg}` : undefined,
        outlineOffset: active ? "-3px" : undefined,
      }}
      className={clsx(
        "group relative flex flex-col justify-between gap-2 overflow-hidden rounded-md p-4 text-left transition-transform hover:-translate-y-0.5",
      )}
    >
      <button
        type="button"
        onClick={() => onCopy(value)}
        aria-label={a11yLabel}
        style={{ color: fg }}
        className="flex items-start justify-between gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <span className="min-w-0 break-words font-mono text-xs font-semibold tabular-nums sm:text-sm">
          {value}
        </span>
        <span
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          {justCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      <div className="flex items-baseline justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitName();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            onBlur={commitName}
            placeholder={autoName}
            aria-label="Rename this colour"
            style={{ color: fg }}
            className="min-w-0 flex-1 truncate border-b border-current/40 bg-transparent text-2xs outline-none placeholder:opacity-60"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={customName ? `Rename ${displayName}` : `Rename, currently ${autoName}`}
            className="min-w-0 truncate rounded-sm text-2xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-current"
          >
            {displayName}
          </button>
        )}
        <span className="shrink-0 font-mono text-2xs tabular-nums">{pct}</span>
      </div>
    </div>
  );
}
