import {
  CUSTOM_PALETTE_ID,
  DEFAULT_SETTINGS,
  MAX_CUSTOM_COLORS,
  MIN_CUSTOM_COLORS,
  type ColorMode,
  type DitherSettings,
} from "./pipeline"
import { MAX_IMAGE_COLORS, MIN_IMAGE_COLORS } from "./extract"
import type { HalftoneShape } from "./types"

/** Bumped only when an old preset could no longer be read correctly. */
export const PRESET_VERSION = 1

export interface Preset {
  version: number
  settings: Partial<DitherSettings>
}

/**
 * Everything a preset carries — which is everything except what belongs to one
 * particular photograph.
 *
 * `imageColors` is deliberately absent. Those are read off the picture that was
 * open at the time, and baking them in would paint someone else's photo in
 * colours it does not contain. The count is kept, so the same number is read
 * back off whatever picture the preset is opened against.
 */
const CARRIED = [
  "methodId",
  "matrixId",
  "pixelSize",
  "cellAspect",
  "patternStrength",
  "shape",
  "angle",
  "serpentine",
  "brightness",
  "contrast",
  "invert",
  "colorMode",
  "ink",
  "paper",
  "paletteId",
  "customColors",
  "imageColorCount",
] as const satisfies readonly (keyof DitherSettings)[]

const SHAPES: HalftoneShape[] = ["circle", "square", "diamond", "line"]
const MODES: ColorMode[] = ["duotone", "palette", "image"]

const HEX = /^#[0-9a-f]{6}$/i

const clamp = (value: unknown, low: number, high: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(high, Math.max(low, value))
    : fallback

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.length > 0 && value.length < 64 ? value : fallback

const hex = (value: unknown, fallback: string) =>
  typeof value === "string" && HEX.test(value) ? value : fallback

const oneOf = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : fallback

/** The current settings as a preset, minus anything photo-specific. */
export function toPreset(settings: DitherSettings): Preset {
  const carried: Partial<DitherSettings> = {}
  for (const key of CARRIED) {
    Object.assign(carried, { [key]: settings[key] })
  }
  return { version: PRESET_VERSION, settings: carried }
}

/**
 * A preset turned back into settings, merged over the defaults.
 *
 * Merging rather than replacing is what lets an old preset survive a new
 * setting being added: whatever it does not mention simply keeps its default.
 * Every value is checked, because a preset can arrive from a file someone
 * edited by hand or a link that lost a character in a chat app, and a pixel
 * size of 9999 or a shape of "banana" would reach the kernels otherwise.
 */
export function fromPreset(preset: Preset | null | undefined): DitherSettings {
  const given = (preset?.settings ?? {}) as Record<string, unknown>
  const base = DEFAULT_SETTINGS

  const customColors = Array.isArray(given.customColors)
    ? given.customColors.filter((c): c is string => typeof c === "string" && HEX.test(c))
    : []

  return {
    ...base,
    // Unknown ids are left to the registries, which already fall back to a real
    // method, matrix and palette rather than throwing.
    methodId: text(given.methodId, base.methodId),
    matrixId: text(given.matrixId, base.matrixId),
    paletteId: text(given.paletteId, base.paletteId),

    pixelSize: Math.round(clamp(given.pixelSize, 1, 16, base.pixelSize)),
    cellAspect: clamp(given.cellAspect, 0.25, 4, base.cellAspect),
    patternStrength: clamp(given.patternStrength, 0, 2, base.patternStrength),
    angle: clamp(given.angle, 0, 90, base.angle),
    brightness: clamp(given.brightness, -100, 100, base.brightness),
    contrast: clamp(given.contrast, -100, 100, base.contrast),
    imageColorCount: Math.round(
      clamp(given.imageColorCount, MIN_IMAGE_COLORS, MAX_IMAGE_COLORS, base.imageColorCount),
    ),

    shape: oneOf(given.shape, SHAPES, base.shape),
    colorMode: oneOf(given.colorMode, MODES, base.colorMode),
    serpentine: bool(given.serpentine, base.serpentine),
    invert: bool(given.invert, base.invert),

    ink: hex(given.ink, base.ink),
    paper: hex(given.paper, base.paper),

    // Too few colours to dither between is not a palette, so a short list falls
    // back rather than reaching the kernels.
    customColors:
      customColors.length >= MIN_CUSTOM_COLORS
        ? customColors.slice(0, MAX_CUSTOM_COLORS)
        : base.customColors,

    // Always re-read from whatever photograph this is opened against.
    imageColors: [],
  }
}

/** Pretty JSON, since a preset file is something a person may well open. */
export function presetToJson(settings: DitherSettings): string {
  return JSON.stringify(toPreset(settings), null, 2) + "\n"
}

export function presetFromJson(json: string): DitherSettings | null {
  try {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== "object") return null
    return fromPreset(parsed as Preset)
  } catch {
    return null
  }
}

/**
 * A preset packed for a URL.
 *
 * base64url rather than plain base64: `+` and `/` do not survive being pasted
 * into a chat window intact, and `=` padding invites a trailing-punctuation
 * bug when someone writes the link into a sentence.
 */
export function encodePreset(settings: DitherSettings): string {
  const json = JSON.stringify(toPreset(settings))
  const bytes = new TextEncoder().encode(json)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodePreset(encoded: string): DitherSettings | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return presetFromJson(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

/** The query key a shared link carries its preset in. */
export const PRESET_PARAM = "p"

/** The preset in the current address, if there is a readable one. */
export function presetFromLocation(search: string): DitherSettings | null {
  const encoded = new URLSearchParams(search).get(PRESET_PARAM)
  return encoded ? decodePreset(encoded) : null
}

export function presetLink(origin: string, settings: DitherSettings): string {
  return `${origin}/?${PRESET_PARAM}=${encodePreset(settings)}`
}

/** A filename that says what the preset actually is. */
export function presetFilename(settings: DitherSettings): string {
  const parts = [settings.methodId, settings.colorMode].filter(Boolean)
  return `ditho-${parts.join("-")}.json`
}

/** Whether the palette in use is the hand-built one, for describing a preset. */
export const usesCustomPalette = (settings: DitherSettings) =>
  settings.colorMode === "palette" && settings.paletteId === CUSTOM_PALETTE_ID
