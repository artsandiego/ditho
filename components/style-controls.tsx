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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PALETTES, getPalette, rgbToHex } from "@/lib/dither"
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

interface StyleControlsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
}

/** How the dither looks: the tone driven into it, and the colours it lands on. */
export function StyleControls({ settings, onChange }: StyleControlsProps) {
  const patch = (part: Partial<DitherSettings>) => onChange({ ...settings, ...part })
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
                          className="absolute -right-1.5 -top-1.5 hidden size-4 items-center justify-center rounded-full border border-border bg-background text-[9px] leading-none text-muted-foreground hover:border-signal hover:text-signal group-hover:flex"
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
                      className="size-8 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:border-signal hover:text-signal"
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
              <div className="mx-5 mb-4 flex overflow-hidden rounded-md border border-white/10">
                {palette.colors.map((colour, index) => (
                  <span
                    key={index}
                    title={rgbToHex(colour)}
                    className="h-5 flex-1"
                    style={{ background: rgbToHex(colour) }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  )
}
