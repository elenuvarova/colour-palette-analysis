/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Restrained neutral scale + a single teal accent (the brand colour
        // shown in the spec, #00ACAA). Avoids generic violet-500 everywhere.
        ink: {
          50: "#f6f7f8",
          100: "#eceef0",
          200: "#d4d8dd",
          300: "#aeb5bf",
          400: "#828d9b",
          500: "#646f7e",
          600: "#4f5866",
          700: "#414853",
          800: "#272c33",
          850: "#1c2025",
          900: "#15181c",
          950: "#0d0f12",
        },
        accent: {
          50: "#e6fbfa",
          100: "#c2f5f3",
          200: "#8aeae7",
          300: "#4dd9d6",
          400: "#1fc2c0",
          500: "#00acaa",
          600: "#008b8a",
          700: "#076e6e",
          800: "#0b5757",
          900: "#0e4949",
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
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
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
