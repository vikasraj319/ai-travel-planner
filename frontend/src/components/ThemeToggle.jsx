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
      className={`w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-all duration-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}