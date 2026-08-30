"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle color theme"
      className={`flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-input hover:text-foreground ${className ?? ""}`}
    >
      <Sun className="hidden size-3.5 dark:block" strokeWidth={1.75} />
      <Moon className="size-3.5 dark:hidden" strokeWidth={1.75} />
    </button>
  )
}
