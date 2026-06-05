/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neutral scale driven by CSS variables so it can flip between dark and
        // light themes without touching components. Values live in index.css.
        ink: {
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          950: "rgb(var(--ink-950) / <alpha-value>)",
        },
        accent: {
          50: "rgb(var(--accent-50) / <alpha-value>)",
          100: "rgb(var(--accent-100) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          700: "rgb(var(--accent-700) / <alpha-value>)",
          800: "rgb(var(--accent-800) / <alpha-value>)",
          900: "rgb(var(--accent-900) / <alpha-value>)",
          // Theme-aware accent for text/icons on the page bg (flips per theme
          // so accent-coloured text clears WCAG AA 4.5:1 in light mode).
          text: "rgb(var(--accent-text) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      // Three-tier radius system. Use sm for chips and inner elements, md for
      // buttons / inputs / swatches, lg for cards and modals. The xl/2xl steps
      // are kept as aliases of lg so any stragglers stay on-system.
      borderRadius: {
        sm: "0.375rem", // 6px — chips, inner pills, small toggles
        md: "0.625rem", // 10px — buttons, inputs, swatches
        lg: "1rem", // 16px — cards, modals
        xl: "1rem",
        "2xl": "1rem",
      },
      boxShadow: {
        // Layered elevation. card = resting surfaces, card-lg = raised cards,
        // pop = floating chrome (sticky bar, toasts, modals).
        card: "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.10)",
        "card-lg": "0 2px 6px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.14)",
        pop: "0 4px 12px rgb(0 0 0 / 0.18), 0 12px 32px rgb(0 0 0 / 0.28)",
      },
      fontSize: {
        // Named steps for "tiny" sizes used in chip labels / numeric badges,
        // so the type scale stays whitelisted (no ad-hoc text-[10/11px]).
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px
        "3xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "toast-in": "toast-in 0.22s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
