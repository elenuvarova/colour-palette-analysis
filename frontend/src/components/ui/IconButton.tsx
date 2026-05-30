import { clsx } from "clsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "secondary" | "ghost" | "overlay";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** The icon element (lucide-react). */
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  secondary:
    "border border-ink-700 bg-ink-850 text-ink-300 hover:text-ink-100",
  ghost: "text-ink-400 hover:text-ink-100 hover:bg-ink-800",
  // Overlay sits on top of an image preview — neutral chrome regardless of theme.
  overlay:
    "border border-ink-700 bg-ink-900 text-ink-300 hover:text-ink-100",
};

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
};

/** Square icon-only button. Use for icon-only chrome (theme toggle, modal close). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "secondary", size = "md", className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={clsx(
          "grid place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          sizes[size],
          variants[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
