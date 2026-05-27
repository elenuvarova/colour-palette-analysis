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
  // Paint the filled portion of the track with the accent colour.
  const trackStyle = {
    background: `linear-gradient(90deg, #00acaa 0%, #00acaa ${pct}%, #272c33 ${pct}%, #272c33 100%)`,
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
