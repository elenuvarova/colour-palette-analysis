import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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

  // Proportional strip: one bare colour segment per colour, width driven by its
  // share. We render no in-segment text — the slivers get as narrow as 40px, so
  // any label would truncate to noise like "10.…". The hex + percent live in
  // the hover tooltip and the detailed cards below instead.
  if (proportional) {
    return (
      <button
        type="button"
        onClick={() => onCopy(value)}
        title={`${value} — ${pct} · click to copy`}
        aria-label={a11yLabel}
        style={{
          backgroundColor: color.hex,
          flexBasis: basis,
          transition: "flex-basis 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
          outline: active ? `2px solid ${fg}` : undefined,
          outlineOffset: active ? "-3px" : undefined,
        }}
        className="group relative h-16 min-w-[40px] flex-1 overflow-hidden first:rounded-l-xl last:rounded-r-xl sm:min-w-[56px]"
      />
    );
  }

  // Detailed card: click anywhere to copy the value; the name is its own
  // inline-editable target. Root is a div+role=button so we can nest an
  // <input> while editing without invalid <button> nesting.
  const cardCopy = () => {
    if (editing) return;
    onCopy(value);
  };
  const cardKey = (e: ReactKeyboardEvent) => {
    if (editing) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCopy(value);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={cardCopy}
      onKeyDown={cardKey}
      title={`Copy ${value}`}
      aria-label={a11yLabel}
      style={{
        backgroundColor: color.hex,
        color: fg,
        outline: active ? `2px solid ${fg}` : undefined,
        outlineOffset: active ? "-3px" : undefined,
      }}
      className={clsx(
        "group relative flex cursor-pointer flex-col justify-between gap-2 overflow-hidden rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words font-mono text-xs font-semibold tabular-nums sm:text-sm">
          {value}
        </span>
        <span
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-80"
          aria-hidden="true"
        >
          {justCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
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
            className="min-w-0 flex-1 truncate border-b border-current/40 bg-transparent text-2xs outline-none placeholder:opacity-50"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            title={customName ? `Rename (${autoName})` : "Rename"}
            className="min-w-0 truncate text-2xs opacity-70 hover:opacity-100"
          >
            {displayName}
          </button>
        )}
        <span className="shrink-0 font-mono text-2xs tabular-nums opacity-80">
          {pct}
        </span>
      </div>
    </div>
  );
}
