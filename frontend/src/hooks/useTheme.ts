import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

/** Light/dark theme with persistence. Toggles a `.light` class on <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    [],
  );

  return { theme, toggle };
}
