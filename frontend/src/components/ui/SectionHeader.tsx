import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Optional right-aligned slot (e.g. an action button). */
  action?: ReactNode;
}

/** Section heading used at the top of every result panel. */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  if (action) {
    return (
      <div className="flex items-start justify-between gap-4">
        <Inner title={title} subtitle={subtitle} />
        <div className="shrink-0">{action}</div>
      </div>
    );
  }
  return <Inner title={title} subtitle={subtitle} />;
}

function Inner({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </h3>
      {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
    </div>
  );
}
