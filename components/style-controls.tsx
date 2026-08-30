"use client"

import { Section } from "@/components/control-primitives"
import { ColorSection } from "@/components/controls/color-section"
import { SECTIONS } from "@/components/controls/sections"
import { ToneSection } from "@/components/controls/tone-section"
import type { DitherSettings } from "@/lib/dither/pipeline"

interface StyleControlsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
}

/**
 * How the dither looks, as the desktop panel stacks it.
 *
 * The groups themselves live in `controls/` because the tab bar shows the same
 * ones one at a time. This is only the arrangement.
 */
export function StyleControls({ settings, onChange }: StyleControlsProps) {
  return (
    <div className="instrument flex flex-col">
      <Section title={SECTIONS.tone.label} icon={SECTIONS.tone.icon}>
        <ToneSection settings={settings} onChange={onChange} />
      </Section>

      <Section title={SECTIONS.color.label} icon={SECTIONS.color.icon}>
        <ColorSection settings={settings} onChange={onChange} />
      </Section>
    </div>
  )
}
