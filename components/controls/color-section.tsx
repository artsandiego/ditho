"use client"

import {
  Choice,
  ColorChip,
  Dial,
  Row,
  Swatch,
  type ChoiceOption,
} from "@/components/control-primitives"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MAX_IMAGE_COLORS,
  MIN_IMAGE_COLORS,
  PALETTES,
  getPalette,
  rgbToHex,
} from "@/lib/dither"
import {
  CUSTOM_PALETTE_ID,
  DEFAULT_CUSTOM_COLORS,
  MAX_CUSTOM_COLORS,
  MIN_CUSTOM_COLORS,
  type ColorMode,
  type DitherSettings,
} from "@/lib/dither/pipeline"

const COLOR_MODES: ChoiceOption<ColorMode>[] = [
  { value: "duotone", label: "Duotone" },
  { value: "palette", label: "Palette" },
  { value: "image", label: "Image" },
]

function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="mx-5 mb-4 flex overflow-hidden rounded-md border border-white/10">
      {colors.map((color, index) => (
        <span
          key={index}
          title={color}
          className="h-5 flex-1"
          style={{ background: color }}
        />
      ))}
    </div>
  )
}

function nextColor(colors: string[]): string {
  return (
    ["#ffffff", "#000000", "#808080", "#ff3d0f"].find(
      (candidate) => !colors.includes(candidate),
    ) ?? "#808080"
  )
}

const isDefaultCustom = (colors: string[]) =>
  colors.length === DEFAULT_CUSTOM_COLORS.length &&
  colors.every((color, index) => color === DEFAULT_CUSTOM_COLORS[index])

export interface ColorSectionProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
}

export function ColorSection({ settings, onChange }: ColorSectionProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
  const palette = getPalette(settings.paletteId)
  const isCustom = settings.paletteId === CUSTOM_PALETTE_ID

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
    <>
      <Choice
        label="Mode"
        options={COLOR_MODES}
        value={settings.colorMode}
        onChange={(colorMode) => patch({ colorMode })}
      />

      {settings.colorMode === "duotone" && (
        <div className="flex items-stretch gap-2 px-5 pb-4">
          <Swatch label="Ink" value={settings.ink} onChange={(ink) => patch({ ink })} />
          <Swatch
            label="Paper"
            value={settings.paper}
            onChange={(paper) => patch({ paper })}
          />
        </div>
      )}

      {settings.colorMode === "image" && (
        <>
          <Dial
            label="Colors"
            readout={String(settings.imageColorCount)}
            value={settings.imageColorCount}
            min={MIN_IMAGE_COLORS}
            max={MAX_IMAGE_COLORS}
            onChange={(imageColorCount) => patch({ imageColorCount })}
          />

          {settings.imageColors.length > 0 ? (
            <Swatches colors={settings.imageColors} />
          ) : (
            <p className="px-5 pb-4 text-[10px] leading-snug text-muted-foreground/70">
              Reading colors from the photo…
            </p>
          )}

          <p className="-mt-1 px-5 pb-3 text-[11px] leading-relaxed text-muted-foreground/80">
            <span className="text-foreground">Ordered or halftone works best here.</span>{" "}
            Error diffusion muddies a small set of colors.
          </p>

          <p className="px-5 pb-4 text-[10px] leading-snug text-muted-foreground/70">
            Pulled from your photo, dark to light. Re-framing re-reads them.
          </p>
        </>
      )}

      {settings.colorMode === "palette" && (
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
                {settings.customColors.map((color, index) => (
                  <div key={index} className="group relative">
                    <ColorChip
                      value={color}
                      label={`Color ${index + 1}`}
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
                        aria-label={`Remove color ${index + 1}`}
                        onClick={() =>
                          patch({
                            customColors: settings.customColors.filter(
                              (_, at) => at !== index,
                            ),
                          })
                        }
                        className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-border bg-background text-[9px] leading-none text-muted-foreground hover:border-signal hover:text-signal [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:flex"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {settings.customColors.length < MAX_CUSTOM_COLORS && (
                  <button
                    type="button"
                    aria-label="Add color"
                    onClick={() =>
                      patch({
                        customColors: [
                          ...settings.customColors,
                          nextColor(settings.customColors),
                        ],
                      })
                    }
                    className="size-8 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:border-signal hover:text-signal"
                  >
                    +
                  </button>
                )}
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground/70">
                Click a swatch to change it, × to drop it. {MIN_CUSTOM_COLORS}–
                {MAX_CUSTOM_COLORS} colors; tone is read from their brightness.
              </p>
            </div>
          ) : (
            <Swatches colors={palette.colors.map(rgbToHex)} />
          )}
        </>
      )}
    </>
  )
}
