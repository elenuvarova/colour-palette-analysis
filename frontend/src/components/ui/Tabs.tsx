import { clsx } from "clsx";
import { useState } from "react";
import type { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultActive?: string;
  ariaLabel?: string;
}

/** Simple controlled-by-default tabs (radio-group of buttons + active panel). */
export function Tabs({ tabs, defaultActive, ariaLabel }: TabsProps) {
  const [active, setActive] = useState<string>(defaultActive ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1 self-start rounded-xl border border-ink-700 bg-ink-850 p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              t.id === active
                ? "bg-accent-500 text-ink-950"
                : "text-ink-400 hover:text-ink-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current && (
        <div role="tabpanel" key={current.id}>
          {current.content}
        </div>
      )}
    </div>
  );
}
