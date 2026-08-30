import { Contrast, Grid3x3, Palette, Waves, type LucideIcon } from "lucide-react"

/** The four groups of controls, in the order they are presented. */
export type EditorTab = "method" | "cell" | "tone" | "color"

export const TAB_ORDER: EditorTab[] = ["method", "cell", "tone", "color"]

/**
 * One source of truth for each group's name and icon.
 *
 * Both layouts read from here — the desktop panel headings and the mobile tab
 * strip — so a group cannot end up called one thing in one place and something
 * else in the other.
 */
export const SECTIONS: Record<EditorTab, { label: string; icon: LucideIcon }> = {
  method: { label: "Method", icon: Waves },
  cell: { label: "Cell", icon: Grid3x3 },
  tone: { label: "Tone", icon: Contrast },
  color: { label: "Color", icon: Palette },
}
