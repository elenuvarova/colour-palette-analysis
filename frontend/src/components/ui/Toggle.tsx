import { clsx } from "clsx";
import { useId } from "react";

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

/** Boolean on/off switch (used for ignore_alpha). */
export function Switch({ label, checked, onChange, hint, disabled }: SwitchProps) {
  const hintId = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-200">{label}</span>
        {hint && (
          <p id={hintId} className="text-xs text-ink-500">
            {hint}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
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
