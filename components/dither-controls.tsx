"use client"

import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ALGORITHMS } from "@/lib/dither"
import type { DitherSettings } from "@/lib/dither/pipeline"

interface DialProps {
  label: string
  readout: string
  hint: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

function Dial({ label, readout, hint, value, min, max, step = 1, onChange }: DialProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
      <div className="flex items-baseline justify-between">
        <span className="label-key">{label}</span>
        <span className="value-readout">{readout}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">{hint}</p>
    </div>
  )
}

interface DitherControlsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  resolution: { width: number; height: number } | null
}

export function DitherControls({ settings, onChange, resolution }: DitherControlsProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
  const algorithm = ALGORITHMS[settings.algorithmId]

  return (
    <div className="instrument flex flex-col">
      <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
        <span className="label-key">Method</span>
        <span className="text-[11px] tracking-tight">{algorithm?.name}</span>
      </div>

      <Dial
        label="Pixel size"
        readout={`${settings.pixelSize}×`}
        hint="Drives the whole look. Larger cells mean fewer, chunkier dots."
        value={settings.pixelSize}
        min={1}
        max={16}
        onChange={(pixelSize) => patch({ pixelSize })}
      />

      <Dial
        label="Threshold"
        readout={String(settings.threshold)}
        hint="Where mid-grey tips from white to black. Lower burns brighter."
        value={settings.threshold}
        min={0}
        max={255}
        onChange={(threshold) => patch({ threshold })}
      />

      <Dial
        label="Contrast"
        readout={settings.contrast > 0 ? `+${settings.contrast}` : String(settings.contrast)}
        hint="Applied before the dither. Pushes detail to the extremes."
        value={settings.contrast}
        min={-100}
        max={100}
        onChange={(contrast) => patch({ contrast })}
      />

      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="label-key">Invert</span>
          <span className="text-[10px] text-muted-foreground/70">White ink on black.</span>
        </div>
        <Switch
          checked={settings.invert}
          onCheckedChange={(invert) => patch({ invert })}
          aria-label="Invert"
        />
      </div>

      <div className="flex items-baseline justify-between px-5 py-4">
        <span className="label-key">Grid</span>
        <span className="value-readout">
          {resolution ? `${resolution.width}×${resolution.height}` : "—"}
        </span>
      </div>
    </div>
  )
}
