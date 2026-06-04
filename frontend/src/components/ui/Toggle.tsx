import { clsx } from "clsx";
import { useRef } from "react";
import type { KeyboardEvent } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  label: string;
  value: T;
  options: [Option<T>, Option<T>];
  onChange: (value: T) => void;
  hint?: string;
}

/**
 * Two-option segmented control (used for mode: fast/precision). Follows the
 * WAI-ARIA APG radio group pattern: one tab stop (the checked option), Arrow
 * keys move and select, Home/End jump to the first/last option.
 */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SegmentedToggleProps<T>) {
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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink-200">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1"
      >
        {options.map((opt, index) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              type="button"
              onClick={() => onChange(opt.value)}
              onKeyDown={onKeyDown}
              className={clsx(
                "h-9 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent-600 text-white"
                  : "text-ink-300 hover:text-ink-100",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

/** Boolean on/off switch (used for ignore_alpha). */
export function Switch({ label, checked, onChange, hint }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-200">{label}</span>
        {hint && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-accent-600" : "bg-ink-700",
        )}
      >
        <span
          className={clsx(
            "inline-block h-5 w-5 transform rounded-full bg-ink-50 shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
