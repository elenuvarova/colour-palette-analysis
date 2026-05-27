import { Slider } from "./ui/Slider";
import { SegmentedToggle, Switch } from "./ui/Toggle";
import type { ExtractMode, ExtractParams } from "../types";

interface ControlsProps {
  params: ExtractParams;
  onChange: (params: ExtractParams) => void;
  disabled?: boolean;
}

export function Controls({ params, onChange, disabled }: ControlsProps) {
  const patch = (next: Partial<ExtractParams>) =>
    onChange({ ...params, ...next });

  return (
    <div className="card flex flex-col gap-6 p-6" aria-disabled={disabled}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
        Parameters
      </h2>

      <Slider
        label="Colours"
        min={3}
        max={16}
        value={params.limit}
        onChange={(v) => patch({ limit: v })}
        hint="How many dominant colours to return."
      />

      <Slider
        label="Tolerance"
        min={0}
        max={100}
        value={params.tolerance}
        onChange={(v) => patch({ tolerance: v })}
        hint="Higher merges similar shades together."
        formatValue={(v) => `${v}`}
      />

      <SegmentedToggle<ExtractMode>
        label="Mode"
        value={params.mode}
        options={[
          { value: "fast", label: "Fast" },
          { value: "precision", label: "Precision" },
        ]}
        onChange={(v) => patch({ mode: v })}
        hint={
          params.mode === "fast"
            ? "Samples pixels for a quick result."
            : "Processes every pixel for accuracy."
        }
      />

      <Switch
        label="Ignore transparent pixels"
        checked={params.ignore_alpha}
        onChange={(v) => patch({ ignore_alpha: v })}
        hint="Skip fully/partly transparent areas."
      />
    </div>
  );
}
