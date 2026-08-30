"use client"

import { Dial } from "@/components/control-primitives"
import { getMethod } from "@/lib/dither"
import type { DitherSettings } from "@/lib/dither/pipeline"

export interface CellSectionProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  resolution: { width: number; height: number } | null
}

export function CellSection({ settings, onChange, resolution }: CellSectionProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
  const family = getMethod(settings.methodId).family

  return (
    <>
      <Dial
        label={family === "halftone" ? "Dot size" : "Pixel size"}
        readout={`${settings.pixelSize}×`}
        value={settings.pixelSize}
        min={1}
        max={16}
        onChange={(pixelSize) => patch({ pixelSize })}
      />
      <Dial
        label="Aspect"
        readout={`${settings.cellAspect.toFixed(2)}×`}
        value={settings.cellAspect}
        min={0.25}
        max={4}
        step={0.05}
        onChange={(cellAspect) => patch({ cellAspect })}
      />
      <div className="flex items-baseline justify-between px-5 py-3.5">
        <span className="label-key">Grid</span>
        <span className="value-readout">
          {resolution ? `${resolution.width}×${resolution.height}` : "—"}
        </span>
      </div>
    </>
  )
}
