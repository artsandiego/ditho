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

export const PRESET_VERSION = 1

export interface Preset {
  version: number
  settings: Partial<DitherSettings>
}

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

export function toPreset(settings: DitherSettings): Preset {
  const carried: Partial<DitherSettings> = {}
  for (const key of CARRIED) {
    Object.assign(carried, { [key]: settings[key] })
  }
  return { version: PRESET_VERSION, settings: carried }
}

export function fromPreset(preset: Preset | null | undefined): DitherSettings {
  const given = (preset?.settings ?? {}) as Record<string, unknown>
  const base = DEFAULT_SETTINGS

  const customColors = Array.isArray(given.customColors)
    ? given.customColors.filter((c): c is string => typeof c === "string" && HEX.test(c))
    : []

  return {
    ...base,
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

    customColors:
      customColors.length >= MIN_CUSTOM_COLORS
        ? customColors.slice(0, MAX_CUSTOM_COLORS)
        : base.customColors,

    imageColors: [],
  }
}

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

export const PRESET_PARAM = "p"

export function presetFromLocation(search: string): DitherSettings | null {
  const encoded = new URLSearchParams(search).get(PRESET_PARAM)
  return encoded ? decodePreset(encoded) : null
}

export function presetLink(origin: string, settings: DitherSettings): string {
  return `${origin}/?${PRESET_PARAM}=${encodePreset(settings)}`
}

export function presetFilename(settings: DitherSettings): string {
  const parts = [settings.methodId, settings.colorMode].filter(Boolean)
  return `ditho-${parts.join("-")}.json`
}

export const usesCustomPalette = (settings: DitherSettings) =>
  settings.colorMode === "palette" && settings.paletteId === CUSTOM_PALETTE_ID
