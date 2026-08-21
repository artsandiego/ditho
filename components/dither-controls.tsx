"use client"

import {
  Choice,
  Dial,
  Row,
  Section,
  Swatch,
  Toggle,
  type ChoiceOption,
} from "@/components/control-primitives"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getMethod, MATRICES, METHODS, PALETTES, getPalette, rgbToHex } from "@/lib/dither"
import type { ColorMode, DitherSettings } from "@/lib/dither/pipeline"
import type { HalftoneShape } from "@/lib/dither/types"

const SHAPES: ChoiceOption<HalftoneShape>[] = [
  { value: "circle", label: "●", title: "Circle" },
  { value: "square", label: "■", title: "Square" },
  { value: "diamond", label: "◆", title: "Diamond" },
  { value: "line", label: "▬", title: "Line" },
]

const COLOR_MODES: ChoiceOption<ColorMode>[] = [
  { value: "duotone", label: "Duotone" },
  { value: "palette", label: "Palette" },
]

const signed = (value: number) => (value > 0 ? `+${value}` : String(value))

interface DitherControlsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  resolution: { width: number; height: number } | null
}

export function DitherControls({ settings, onChange, resolution }: DitherControlsProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
  const family = getMethod(settings.methodId).family
  const palette = getPalette(settings.paletteId)

  return (
    <div className="instrument flex flex-col">
      <Section title="Method">
        <Row label="Algorithm">
          <Select value={settings.methodId} onValueChange={(methodId) => patch({ methodId })}>
            <SelectTrigger className="h-9 w-full text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="label-key">Error diffusion</SelectLabel>
                {METHODS.filter((m) => m.family === "diffusion").map((method) => (
                  <SelectItem key={method.id} value={method.id} className="text-[11px]">
                    {method.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="label-key">Pattern</SelectLabel>
                {METHODS.filter((m) => m.family !== "diffusion").map((method) => (
                  <SelectItem key={method.id} value={method.id} className="text-[11px]">
                    {method.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Row>

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
      </Section>

      <Section title="Cell">
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
      </Section>

      <Section title="Tone">
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
      </Section>

      <Section title="Colour">
        <Choice
          label="Mode"
          options={COLOR_MODES}
          value={settings.colorMode}
          onChange={(colorMode) => patch({ colorMode })}
        />

        {settings.colorMode === "duotone" ? (
          <div className="flex items-stretch gap-2 px-5 pb-4">
            <Swatch label="Ink" value={settings.ink} onChange={(ink) => patch({ ink })} />
            <Swatch
              label="Paper"
              value={settings.paper}
              onChange={(paper) => patch({ paper })}
            />
          </div>
        ) : (
          <>
            <Row label="Set">
              <Select
                value={settings.paletteId}
                onValueChange={(paletteId) => patch({ paletteId })}
              >
                <SelectTrigger className="h-9 w-full text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PALETTES.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id} className="text-[11px]">
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <div className="flex px-5 pb-4">
              {palette.colors.map((colour, index) => (
                <span
                  key={index}
                  title={rgbToHex(colour)}
                  className="h-5 flex-1 border-y border-r border-white/10 first:border-l"
                  style={{ background: rgbToHex(colour) }}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      <div className="flex items-baseline justify-between px-5 py-3.5">
        <span className="label-key">Grid</span>
        <span className="value-readout">
          {resolution ? `${resolution.width}×${resolution.height}` : "—"}
        </span>
      </div>
    </div>
  )
}
