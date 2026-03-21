import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("cligrep-theme") || "system");
  const [resolvedTheme, setResolvedTheme] = useState("dark");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      setResolvedTheme(theme === "system" ? (media.matches ? "dark" : "light") : theme);
    };
    updateTheme();
    media.addEventListener("change", updateTheme);
    return () => media.removeEventListener("change", updateTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    localStorage.setItem("cligrep-theme", theme);
  }, [theme]);

  function cycleTheme() {
    const options = ["system", "dark", "light"];
    const idx = options.indexOf(theme);
    setTheme(options[(idx + 1) % options.length]);
  }

  return { theme, setTheme, resolvedTheme, cycleTheme };
}
