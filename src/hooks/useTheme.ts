import { useEffect, useState } from "react";
import type { ResolvedTheme, ThemeOption } from "../types";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeOption>(() => {
    const savedTheme = localStorage.getItem("cligrep-theme");
    return savedTheme === "dark" || savedTheme === "light" || savedTheme === "system" ? savedTheme : "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

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
    const options: ThemeOption[] = ["system", "dark", "light"];
    const idx = options.indexOf(theme);
    setTheme(options[(idx + 1) % options.length]);
  }

  return { theme, setTheme, resolvedTheme, cycleTheme };
}
