"use client"

import { Dial, Toggle } from "@/components/control-primitives"
import type { DitherSettings } from "@/lib/dither/pipeline"

const signed = (value: number) => (value > 0 ? `+${value}` : String(value))

export interface ToneSectionProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
}

export function ToneSection({ settings, onChange }: ToneSectionProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })

  return (
    <>
      <Dial
        label="Brightness"
        readout={signed(settings.brightness)}
        value={settings.brightness}
        min={-100}
        max={100}
        onChange={(brightness) => patch({ brightness })}
      />
      <Dial
        label="Contrast"
        readout={signed(settings.contrast)}
        value={settings.contrast}
        min={-100}
        max={100}
        onChange={(contrast) => patch({ contrast })}
      />
      <Toggle
        label="Invert"
        hint="Flip the tone range before dithering."
        checked={settings.invert}
        onChange={(invert) => patch({ invert })}
      />
    </>
  )
}
