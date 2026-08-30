"use client"

import { Choice, Dial, Row, Toggle, type ChoiceOption } from "@/components/control-primitives"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getMethod, MATRICES, METHODS, videoMethods } from "@/lib/dither"
import type { DitherSettings } from "@/lib/dither/pipeline"
import type { HalftoneShape } from "@/lib/dither/types"

const SHAPES: ChoiceOption<HalftoneShape>[] = [
  { value: "circle", label: "●", title: "Circle" },
  { value: "square", label: "■", title: "Square" },
  { value: "diamond", label: "◆", title: "Diamond" },
  { value: "line", label: "▬", title: "Line" },
]

export interface MethodSectionProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  /** Video only offers the methods whose pattern holds still between frames. */
  forVideo?: boolean
}

/** Which algorithm, and the options that only that family understands. */
export function MethodSection({
  settings,
  onChange,
  forVideo = false,
}: MethodSectionProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
  const family = getMethod(settings.methodId).family
  const available = forVideo ? videoMethods() : METHODS

  return (
    <>
      <Row label="Algorithm">
        <Select value={settings.methodId} onValueChange={(methodId) => patch({ methodId })}>
          <SelectTrigger className="h-9 w-full text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {available.some((m) => m.family === "diffusion") && (
              <SelectGroup>
                <SelectLabel className="label-key">Error diffusion</SelectLabel>
                {available
                  .filter((m) => m.family === "diffusion")
                  .map((method) => (
                    <SelectItem key={method.id} value={method.id} className="text-[11px]">
                      {method.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel className="label-key">Pattern</SelectLabel>
              {available
                .filter((m) => m.family !== "diffusion")
                .map((method) => (
                  <SelectItem key={method.id} value={method.id} className="text-[11px]">
                    {method.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>

      {forVideo && (
        <p className="px-5 pb-3 text-[11px] leading-relaxed text-muted-foreground/80">
          These are the methods suited to video. Their pattern comes from each
          pixel&rsquo;s position, so it holds still between frames — error diffusion
          recomputes itself every frame and visibly boils on playback.
        </p>
      )}

      {family === "diffusion" && (
        <Toggle
          label="Serpentine"
          hint="Alternate the scan direction to break up directional streaking."
          checked={settings.serpentine}
          onChange={(serpentine) => patch({ serpentine })}
        />
      )}

      {family === "ordered" && (
        <>
          <Row label="Pattern">
            <Select
              value={settings.matrixId}
              onValueChange={(matrixId) => patch({ matrixId })}
            >
              <SelectTrigger className="h-9 w-full text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATRICES.map((matrix) => (
                  <SelectItem key={matrix.id} value={matrix.id} className="text-[11px]">
                    {matrix.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Dial
            label="Strength"
            readout={`${settings.patternStrength.toFixed(2)}×`}
            value={settings.patternStrength}
            min={0}
            max={2}
            step={0.05}
            onChange={(patternStrength) => patch({ patternStrength })}
          />
        </>
      )}

      {family === "halftone" && (
        <>
          <Choice
            label="Dot shape"
            options={SHAPES}
            value={settings.shape}
            onChange={(shape) => patch({ shape })}
          />
          <Dial
            label="Screen angle"
            readout={`${settings.angle}°`}
            value={settings.angle}
            min={0}
            max={90}
            onChange={(angle) => patch({ angle })}
          />
        </>
      )}
    </>
  )
}
