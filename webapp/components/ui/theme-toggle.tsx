"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Floating light/dark theme switch. Fixed to the top-right of every page so it
 * is reachable from the landing page, the login screen, and every app page
 * (including the chrome-free routes where the sidebar is hidden).
 *
 * Renders nothing until mounted to avoid a hydration mismatch (the server can't
 * know the persisted theme). Purely cosmetic — never touches app state.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold
        border backdrop-blur-md transition-all duration-200
        bg-white/10 border-white/20 text-white hover:bg-white/20
        light:bg-slate-900/5 light:border-slate-900/15 light:text-slate-700 light:hover:bg-slate-900/10"
      style={
        isDark
          ? undefined
          : {
              background: "rgba(15,23,42,0.05)",
              borderColor: "rgba(15,23,42,0.15)",
              color: "#334155",
            }
      }
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label="Toggle light/dark theme"
    >
      {isDark ? <Sun size={15} className="text-amber-300" /> : <Moon size={15} className="text-sky-700" />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
