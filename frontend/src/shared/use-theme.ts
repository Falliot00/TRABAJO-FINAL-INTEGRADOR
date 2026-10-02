import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem("cilgas.theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* El tema sigue disponible si el navegador restringe el almacenamiento. */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("cilgas.theme", theme);
    } catch {
      /* Preferencia sólo en memoria. */
    }
  }, [theme]);
  return {
    theme,
    toggleTheme: () =>
      setTheme((value) => (value === "light" ? "dark" : "light")),
  };
}
