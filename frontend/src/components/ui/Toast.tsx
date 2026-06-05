import { clsx } from "clsx";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface ToastData {
  id: number;
  message: string;
  tone?: "default" | "error";
}

interface ToastViewportProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

// Errors linger longer than confirmations so they can actually be read.
const DURATION_DEFAULT_MS = 2200;
const DURATION_ERROR_MS = 6000;

/** Fixed-position stack of transient toasts. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const isError = toast.tone === "error";
  const duration = isError ? DURATION_ERROR_MS : DURATION_DEFAULT_MS;
  // Track remaining time so pausing (hover/focus) doesn't reset the countdown.
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  // Auto-dismiss, pausable. The effect re-runs when `paused` flips: on pause we
  // record how much time is left; on resume we schedule the rest.
  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      className={clsx(
        "pointer-events-auto flex animate-toast-in items-center gap-2 rounded-md border py-2.5 pl-3.5 pr-2 text-sm shadow-pop backdrop-blur",
        isError
          ? "border-red-500/40 bg-red-950/90 text-red-100"
          : "border-ink-700 bg-ink-800/95 text-ink-100",
      )}
      role={isError ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {isError ? (
        <X className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
      ) : (
        <Check className="h-4 w-4 shrink-0 text-accent-300" aria-hidden="true" />
      )}
      <span className="font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-my-1 ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-sm opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
