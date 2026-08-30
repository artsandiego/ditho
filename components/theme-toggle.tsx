"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

/**
 * Both icons are rendered and CSS picks one off the `dark` class. next-themes
 * sets that class before first paint, so this needs no mounted flag and cannot
 * flash the wrong icon or disagree with the server-rendered markup.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle color theme"
      // `className` last so a caller can override the border and colour — sat on
      // a photograph rather than a panel, the default pair reads as invisible.
      className={`flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-input hover:text-foreground ${className ?? ""}`}
    >
      <Sun className="hidden size-3.5 dark:block" strokeWidth={1.75} />
      <Moon className="size-3.5 dark:hidden" strokeWidth={1.75} />
    </button>
  )
}
