import { clsx } from "clsx";
import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** A single shimmering placeholder block. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={clsx(
        "shimmer relative overflow-hidden rounded-lg bg-ink-800",
        className,
      )}
    />
  );
}

/** Placeholder that mirrors the results layout while extracting. */
export function PaletteSkeleton() {
  // Relative widths approximate a real palette's proportional bands.
  const bands = [28, 22, 18, 14, 10, 8];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1 overflow-hidden rounded-xl">
          {bands.map((basis, i) => (
            <Skeleton
              key={i}
              className="h-28 rounded-none first:rounded-l-xl last:rounded-r-xl"
              style={{ flexBasis: `${basis}%` }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
