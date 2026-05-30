import { useId } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  hint?: string;
  formatValue?: (value: number) => string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
  formatValue,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  // Both filled and empty sides follow theme variables — accent stays constant
  // across themes, ink-800 flips with light/dark.
  const trackStyle = {
    background: `linear-gradient(90deg, rgb(var(--accent-500)) 0%, rgb(var(--accent-500)) ${pct}%, rgb(var(--ink-800)) ${pct}%, rgb(var(--ink-800)) 100%)`,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-200">
          {label}
        </label>
        <span className="font-mono text-sm tabular-nums text-accent-300">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="cpa-range"
        style={trackStyle}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
