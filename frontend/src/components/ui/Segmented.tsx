import { clsx } from "clsx";

type Size = "sm" | "md";

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: Size;
  ariaLabel?: string;
}

/** Generic segmented control (radio group) for 2+ options. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1"
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "rounded-lg font-medium transition-colors",
            size === "md" ? "h-9 px-3 text-sm" : "px-2.5 py-1.5 text-xs",
            opt.value === value
              ? "bg-accent-500 text-ink-950"
              : "text-ink-400 hover:text-ink-100",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
