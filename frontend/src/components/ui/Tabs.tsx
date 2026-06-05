import { clsx } from "clsx";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

interface Tab {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultActive?: string;
  ariaLabel?: string;
}

/**
 * Controlled-by-default tabs following the WAI-ARIA APG tabs pattern:
 * roving tabindex (active tab is the only tab stop), ArrowLeft/Right to move
 * and activate, Home/End to jump to the first/last tab. Each tab is linked to
 * its panel via aria-controls / aria-labelledby; the panel is focusable.
 */
export function Tabs({ tabs, defaultActive, ariaLabel }: TabsProps) {
  const [active, setActive] = useState<string>(defaultActive ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const focusTab = (id: string) => {
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.findIndex((t) => t.id === active);
    if (index < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusTab(tabs[(index + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusTab(tabs[(index - 1 + tabs.length) % tabs.length].id);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(tabs[0].id);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTab(tabs[tabs.length - 1].id);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1 self-start rounded-sm border border-ink-700 bg-ink-850 p-1"
      >
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={onKeyDown}
              className={clsx(
                "flex min-h-[44px] items-center rounded-sm px-3 text-xs font-medium transition-colors",
                selected
                  ? "bg-accent-600 text-white"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          role="tabpanel"
          key={current.id}
          id={panelId(current.id)}
          aria-labelledby={tabId(current.id)}
          tabIndex={0}
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
