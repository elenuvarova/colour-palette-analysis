import { clsx } from "clsx";

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

/** Two-option segmented control (used for mode: fast/precision). */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SegmentedToggleProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink-200">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              type="button"
              onClick={() => onChange(opt.value)}
              className={clsx(
                "h-9 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent-500 text-ink-950"
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
          checked ? "bg-accent-500" : "bg-ink-700",
        )}
      >
        <span
          className={clsx(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
