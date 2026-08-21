import { downscaleCanvas, readImageData } from "@/lib/image/canvas"

import { applyCurve, toneCurve } from "./adjust"
import { DEFAULT_METHOD_ID, getMethod } from "./index"
import { getPalette, hexToRgb } from "./palette"
import type { HalftoneShape, RGB } from "./types"

export type ColorMode = "duotone" | "palette"

export interface DitherSettings {
  methodId: string
  /** Threshold matrix for the ordered method. */
  matrixId: string
  /** 1 = finest grain, 16 = chunky. Divides the dither grid resolution. */
  pixelSize: number
  /** Horizontal stretch of a cell. 1 is square. */
  cellAspect: number
  /** How hard the ordered threshold matrix is applied. */
  patternStrength: number
  shape: HalftoneShape
  /** Halftone screen angle, degrees. */
  angle: number
  serpentine: boolean
  brightness: number
  contrast: number
  invert: boolean
  colorMode: ColorMode
  ink: string
  paper: string
  paletteId: string
  /** Hex colours used when `paletteId` is "custom". */
  customColors: string[]
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
}

/** Longest edge of the dither grid at pixelSize 1. */
export const BASE_DITHER_EDGE = 1200

export interface DitherResult {
  image: ImageData
  /**
   * Display aspect ratio. Once cells stop being square the grid no longer
   * matches the photograph's proportions, and the canvas has to be stretched
   * back rather than shown at its own.
   */
  aspect: number
}

/**
 * The grid the dither actually runs on.
 *
 * This is the whole trick: dithering a 2400px photo at full resolution makes a
 * pattern too fine to see and the result just reads as grey. We dither small
 * and let the canvas scale back up with nearest-neighbour.
 */
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

const FALLBACK: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
]

export function resolvePalette(settings: DitherSettings): RGB[] {
  if (settings.colorMode === "duotone") {
    return [hexToRgb(settings.ink), hexToRgb(settings.paper)]
  }

  if (settings.paletteId === CUSTOM_PALETTE_ID) {
    // Every kernel assumes at least two entries to choose between.
    return settings.customColors.length >= MIN_CUSTOM_COLORS
      ? settings.customColors.map(hexToRgb)
      : FALLBACK
  }

  return getPalette(settings.paletteId).colors
}

/**
 * Cropped canvas in, dithered `ImageData` out. Synchronous and side-effect free.
 *
 * Halftone is the exception to the downscale rule: its cells need several
 * pixels each to draw a dot into, so it renders on the full-resolution grid and
 * spends the pixel-size control on cell size instead.
 */
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

  const small = downscaleCanvas(source, width, height)
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

  // Copied in rather than wrapped: ImageData insists on a plain ArrayBuffer,
  // while the kernels hand back whatever buffer they allocated.
  const image = new ImageData(result.width, result.height)
  image.data.set(result.data)

  return { image, aspect: source.width / source.height }
}
