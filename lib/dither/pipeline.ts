import { downscaleCanvas, readImageData } from "@/lib/image/canvas"
import { applyCurve, toneCurve } from "./adjust"
import { DEFAULT_IMAGE_COLORS, MIN_IMAGE_COLORS } from "./extract"
import { DEFAULT_METHOD_ID, getMethod } from "./index"
import { getPalette, hexToRgb } from "./palette"
import type { HalftoneShape, RGB } from "./types"

export type ColorMode = "duotone" | "palette" | "image"

export interface DitherSettings {
  methodId: string
  matrixId: string
  pixelSize: number
  cellAspect: number
  patternStrength: number
  shape: HalftoneShape
  angle: number
  serpentine: boolean
  brightness: number
  contrast: number
  invert: boolean
  colorMode: ColorMode
  ink: string
  paper: string
  paletteId: string
  customColors: string[]
  imageColors: string[]
  imageColorCount: number
}

export const CUSTOM_PALETTE_ID = "custom"
export const MIN_CUSTOM_COLORS = 2
export const MAX_CUSTOM_COLORS = 8

export const DEFAULT_CUSTOM_COLORS = ["#12100e", "#3f5e5a", "#d98e4a", "#f2e8dc"]

export const DEFAULT_SETTINGS: DitherSettings = {
  methodId: DEFAULT_METHOD_ID,
  matrixId: "bayer-4",
  pixelSize: 3,
  cellAspect: 1,
  patternStrength: 1,
  shape: "circle",
  angle: 45,
  serpentine: true,
  brightness: 0,
  contrast: 10,
  invert: false,
  colorMode: "duotone",
  ink: "#000000",
  paper: "#ffffff",
  paletteId: "mono",
  customColors: DEFAULT_CUSTOM_COLORS,
  imageColors: [],
  imageColorCount: DEFAULT_IMAGE_COLORS,
}

export const BASE_DITHER_EDGE = 1200

export interface DitherResult {
  image: ImageData
  aspect: number
}

export function ditherResolution(
  width: number,
  height: number,
  pixelSize: number,
  cellAspect: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  const scale = Math.min(longest, BASE_DITHER_EDGE) / longest
  const size = Math.max(1, pixelSize)
  const aspect = Math.max(0.1, cellAspect)

  return {
    width: Math.max(1, Math.round((width * scale) / (size * aspect))),
    height: Math.max(1, Math.round((height * scale) / size)),
  }
}

let downscaled: {
  source: HTMLCanvasElement
  width: number
  height: number
  result: HTMLCanvasElement
} | null = null

function cachedDownscale(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  if (
    downscaled &&
    downscaled.source === source &&
    downscaled.width === width &&
    downscaled.height === height
  ) {
    return downscaled.result
  }

  const result = downscaleCanvas(source, width, height)
  downscaled = { source, width, height, result }
  return result
}

const FALLBACK: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
]

export function resolvePalette(settings: DitherSettings): RGB[] {
  if (settings.colorMode === "duotone") {
    return [hexToRgb(settings.ink), hexToRgb(settings.paper)]
  }

  if (settings.colorMode === "image") {
    return settings.imageColors.length >= MIN_IMAGE_COLORS
      ? settings.imageColors.map(hexToRgb)
      : FALLBACK
  }

  if (settings.paletteId === CUSTOM_PALETTE_ID) {
    return settings.customColors.length >= MIN_CUSTOM_COLORS
      ? settings.customColors.map(hexToRgb)
      : FALLBACK
  }

  return getPalette(settings.paletteId).colors
}

export function renderDither(
  source: HTMLCanvasElement,
  settings: DitherSettings,
): DitherResult {
  const method = getMethod(settings.methodId)
  const isHalftone = method.family === "halftone"

  const { width, height } = ditherResolution(
    source.width,
    source.height,
    isHalftone ? 1 : settings.pixelSize,
    isHalftone ? 1 : settings.cellAspect,
  )

  const small = cachedDownscale(source, width, height)
  const adjusted = applyCurve(
    readImageData(small),
    toneCurve(settings.brightness, settings.contrast, settings.invert),
  )

  const result = method.apply(adjusted, {
    palette: resolvePalette(settings),
    serpentine: settings.serpentine,
    patternStrength: settings.patternStrength,
    matrixId: settings.matrixId,
    cellSize: settings.pixelSize * 2,
    angle: settings.angle,
    shape: settings.shape,
    cellAspect: settings.cellAspect,
  })

  const image = new ImageData(result.width, result.height)
  image.data.set(result.data)

  return { image, aspect: source.width / source.height }
}
