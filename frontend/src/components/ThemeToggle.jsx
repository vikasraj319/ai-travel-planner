import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`nav-theme-toggle w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun className="nav-theme-toggle__icon w-4 h-4" />
      ) : (
        <Moon className="nav-theme-toggle__icon w-4 h-4" />
      )}
    </button>
  );
}
