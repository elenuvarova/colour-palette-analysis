import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Optional right-aligned slot (e.g. an action button). */
  action?: ReactNode;
  /** Heading level for the title. Defaults to 3 (panel sub-heading); pass 2
   *  for a top-level result section so the document outline stays correct. */
  level?: 2 | 3;
  /** Optional id so a parent can wire aria-labelledby to the heading. */
  titleId?: string;
}

/** Section heading used at the top of every result panel. */
export function SectionHeader({
  title,
  subtitle,
  action,
  level = 3,
  titleId,
}: SectionHeaderProps) {
  if (action) {
    return (
      <div className="flex items-start justify-between gap-4">
        <Inner title={title} subtitle={subtitle} level={level} titleId={titleId} />
        <div className="shrink-0">{action}</div>
      </div>
    );
  }
  return <Inner title={title} subtitle={subtitle} level={level} titleId={titleId} />;
}

function Inner({
  title,
  subtitle,
  level,
  titleId,
}: {
  title: string;
  subtitle?: ReactNode;
  level: 2 | 3;
  titleId?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div>
      <Heading
        id={titleId}
        className="text-sm font-semibold uppercase tracking-wide text-ink-400"
      >
        {title}
      </Heading>
      {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
    </div>
  );
}
