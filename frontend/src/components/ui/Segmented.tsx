import { clsx } from "clsx";
import { useRef } from "react";
import type { KeyboardEvent } from "react";

type Size = "sm" | "md";

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: Size;
  ariaLabel?: string;
}

/**
 * Generic single-select segmented control following the WAI-ARIA APG radio
 * group pattern: one tab stop for the whole group (the checked option), Arrow
 * keys move selection between options and wrap, Home/End jump to the first/last
 * option. Space/Enter are harmless since arrow keys already select.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    refs.current[index]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
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

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1"
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
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={onKeyDown}
            className={clsx(
              "rounded-lg font-medium transition-colors",
              size === "md" ? "h-9 px-3 text-sm" : "px-2.5 py-1.5 text-xs",
              checked
                ? "bg-accent-600 text-white"
                : "text-ink-400 hover:text-ink-100",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
