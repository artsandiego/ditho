"use client"

import { Section } from "@/components/control-primitives"
import { CellSection } from "@/components/controls/cell-section"
import { MethodSection } from "@/components/controls/method-section"
import { SECTIONS } from "@/components/controls/sections"
import type { DitherSettings } from "@/lib/dither/pipeline"

interface MethodControlsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  resolution: { width: number; height: number } | null
  forVideo?: boolean
}

export function MethodControls({
  settings,
  onChange,
  resolution,
  forVideo = false,
}: MethodControlsProps) {
  return (
    <div className="instrument flex flex-col">
      <Section title={SECTIONS.method.label} icon={SECTIONS.method.icon}>
        <MethodSection settings={settings} onChange={onChange} forVideo={forVideo} />
      </Section>

      <Section title={SECTIONS.cell.label} icon={SECTIONS.cell.icon}>
        <CellSection settings={settings} onChange={onChange} resolution={resolution} />
      </Section>
    </div>
  )
}
