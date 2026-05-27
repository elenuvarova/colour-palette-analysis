import { clsx } from "clsx";
import { Check, X } from "lucide-react";
import { useEffect } from "react";

export interface ToastData {
  id: number;
  message: string;
  tone?: "default" | "error";
}

interface ToastViewportProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

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
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 2200);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={clsx(
        "pointer-events-auto flex animate-toast-in items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg shadow-black/40 backdrop-blur",
        toast.tone === "error"
          ? "border-red-500/40 bg-red-950/80 text-red-100"
          : "border-ink-700 bg-ink-800/90 text-ink-100",
      )}
      role="status"
    >
      {toast.tone === "error" ? (
        <X className="h-4 w-4 text-red-400" />
      ) : (
        <Check className="h-4 w-4 text-accent-400" />
      )}
      <span className="font-medium">{toast.message}</span>
    </div>
  );
}
