import { clsx } from "clsx";
import { useId, useRef } from "react";
import type { KeyboardEvent } from "react";

type Size = "sm" | "md";

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: Size;
  ariaLabel?: string;
  /** Visible group label rendered above the control. */
  label?: string;
  /** Helper text rendered below the control (wired up via aria-describedby). */
  hint?: string;
  /** Stretch options to share the row equally (e.g. a two-option mode switch). */
  fullWidth?: boolean;
  disabled?: boolean;
}

/**
 * Generic single-select segmented control following the WAI-ARIA APG radio
 * group pattern: one tab stop for the whole group (the checked option), Arrow
 * keys move selection between options and wrap, Home/End jump to the first/last
 * option. Space/Enter are harmless since arrow keys already select.
 *
 * With `label`/`hint`/`fullWidth` it also covers the labelled two-option mode
 * switch (previously a separate SegmentedToggle).
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
  label,
  hint,
  fullWidth,
  disabled,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hintId = useId();

  const select = (index: number) => {
    if (disabled) return;
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    refs.current[index]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const index = options.findIndex((o) => o.value === value);
    if (index < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      select((index + 1) % options.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      select((index - 1 + options.length) % options.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0);
    } else if (e.key === "End") {
      e.preventDefault();
      select(options.length - 1);
    }
  };

  const group = (
    <div
      role="radiogroup"
      aria-label={label ?? ariaLabel}
      aria-describedby={hint ? hintId : undefined}
      className={clsx(
        "gap-1 rounded-sm border border-ink-700 bg-ink-850 p-1",
        fullWidth ? "grid grid-cols-2" : "flex",
      )}
    >
      {options.map((opt, index) => {
        const checked = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={label ? `${label}: ${opt.label}` : undefined}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            onKeyDown={onKeyDown}
            className={clsx(
              // Tap target is at least 44px tall (WCAG 2.5.8); the visible pill
              // keeps its compact look via the inner span.
              "group/seg flex min-h-[44px] items-center justify-center rounded-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              size === "md" ? "text-sm" : "text-xs",
              checked
                ? "bg-accent-600 text-white"
                : "text-ink-400 hover:text-ink-100",
            )}
          >
            <span
              className={clsx(
                size === "md" ? "px-3" : "px-2.5",
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!label && !hint) return group;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-ink-200">{label}</span>
      )}
      {group}
      {hint && (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
    </div>
  );
}
