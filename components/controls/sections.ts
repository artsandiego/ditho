import { Contrast, Grid3x3, Palette, Waves, type LucideIcon } from "lucide-react"

export type EditorTab = "method" | "cell" | "tone" | "color"

export const TAB_ORDER: EditorTab[] = ["method", "cell", "tone", "color"]

export const SECTIONS: Record<EditorTab, { label: string; icon: LucideIcon }> = {
  method: { label: "Method", icon: Waves },
  cell: { label: "Cell", icon: Grid3x3 },
  tone: { label: "Tone", icon: Contrast },
  color: { label: "Color", icon: Palette },
}
