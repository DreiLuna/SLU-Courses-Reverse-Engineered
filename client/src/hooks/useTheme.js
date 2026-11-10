// Light / dark / follow-the-system theme, remembered per browser.
import { useEffect, useState } from "react";

const KEY = "courseSearch.theme";
export const THEMES = ["system", "light", "dark"];

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage blocked: theme lasts for this visit only */
    }
  }, [theme]);

  const cycle = () => setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
  return { theme, cycle };
}
