"use client"

import {
  Choice,
  ColorChip,
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
import {
  CUSTOM_PALETTE_ID,
  DEFAULT_CUSTOM_COLORS,
  MAX_CUSTOM_COLORS,
  MIN_CUSTOM_COLORS,
  type ColorMode,
  type DitherSettings,
} from "@/lib/dither/pipeline"
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

/** A colour the set does not already contain, so a new chip is visibly new. */
function nextColor(colors: string[]): string {
  return (
    ["#ffffff", "#000000", "#808080", "#ff3d0f"].find(
      (candidate) => !colors.includes(candidate),
    ) ?? "#808080"
  )
}

const isDefaultCustom = (colors: string[]) =>
  colors.length === DEFAULT_CUSTOM_COLORS.length &&
  colors.every((colour, index) => colour === DEFAULT_CUSTOM_COLORS[index])

interface DitherControlsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  resolution: { width: number; height: number } | null
}

export function DitherControls({ settings, onChange, resolution }: DitherControlsProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
  const family = getMethod(settings.methodId).family
  const palette = getPalette(settings.paletteId)
  const isCustom = settings.paletteId === CUSTOM_PALETTE_ID

  // Switching to Custom copies the set you were just on, so tweaking an
  // existing palette does not mean retyping it. Only while the custom colours
  // are still untouched — once edited, they are yours and never overwritten.
  const selectPalette = (paletteId: string) => {
    if (
      paletteId === CUSTOM_PALETTE_ID &&
      !isCustom &&
      isDefaultCustom(settings.customColors)
    ) {
      patch({
        paletteId,
        customColors: getPalette(settings.paletteId)
          .colors.slice(0, MAX_CUSTOM_COLORS)
          .map(rgbToHex),
      })
      return
    }
    patch({ paletteId })
  }

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
              <Select value={settings.paletteId} onValueChange={selectPalette}>
                <SelectTrigger className="h-9 w-full text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PALETTES.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id} className="text-[11px]">
                      {entry.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_PALETTE_ID} className="text-[11px]">
                    Custom…
                  </SelectItem>
                </SelectContent>
              </Select>
            </Row>

            {isCustom ? (
              <div className="flex flex-col gap-2.5 px-5 pb-4">
                <div className="flex flex-wrap gap-1.5">
                  {settings.customColors.map((colour, index) => (
                    <div key={index} className="group relative">
                      <ColorChip
                        value={colour}
                        label={`Colour ${index + 1}`}
                        className="size-8"
                        onChange={(next) =>
                          patch({
                            customColors: settings.customColors.map((existing, at) =>
                              at === index ? next : existing,
                            ),
                          })
                        }
                      />
                      {settings.customColors.length > MIN_CUSTOM_COLORS && (
                        <button
                          type="button"
                          aria-label={`Remove colour ${index + 1}`}
                          onClick={() =>
                            patch({
                              customColors: settings.customColors.filter(
                                (_, at) => at !== index,
                              ),
                            })
                          }
                          className="absolute -right-1.5 -top-1.5 hidden size-4 items-center justify-center border border-border bg-background text-[9px] leading-none text-muted-foreground hover:border-signal hover:text-signal group-hover:flex"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {settings.customColors.length < MAX_CUSTOM_COLORS && (
                    <button
                      type="button"
                      aria-label="Add colour"
                      onClick={() =>
                        patch({
                          customColors: [
                            ...settings.customColors,
                            nextColor(settings.customColors),
                          ],
                        })
                      }
                      className="size-8 border border-dashed border-input text-muted-foreground transition-colors hover:border-signal hover:text-signal"
                    >
                      +
                    </button>
                  )}
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground/70">
                  Click a swatch to change it, × to drop it. {MIN_CUSTOM_COLORS}–
                  {MAX_CUSTOM_COLORS} colours; tone is read from their brightness.
                </p>
              </div>
            ) : (
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
            )}
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
