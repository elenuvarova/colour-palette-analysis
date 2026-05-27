import { clsx } from "clsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-ink-950 hover:bg-accent-400 active:bg-accent-600",
  secondary:
    "bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-700 active:bg-ink-800",
  ghost: "text-ink-300 hover:text-ink-100 hover:bg-ink-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", icon, className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  },
);
