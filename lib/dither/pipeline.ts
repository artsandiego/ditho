import { downscaleCanvas, readImageData } from "@/lib/image/canvas"

import { getAlgorithm, DEFAULT_ALGORITHM_ID } from "./index"
import { applyContrast, toGrayscale } from "./grayscale"

export interface DitherSettings {
  algorithmId: string
  /** 1 = finest grain, 16 = chunky. Divides the dither grid resolution. */
  pixelSize: number
  /** Black/white cutoff, 0-255. */
  threshold: number
  /** -100 to 100, applied before dithering. */
  contrast: number
  invert: boolean
}

export const DEFAULT_SETTINGS: DitherSettings = {
  algorithmId: DEFAULT_ALGORITHM_ID,
  pixelSize: 3,
  threshold: 128,
  contrast: 10,
  invert: false,
}

/** Longest edge of the dither grid at pixelSize 1. */
export const BASE_DITHER_EDGE = 1200

/**
 * The grid the dither actually runs on.
 *
 * This is the whole trick: dithering a 2400px photo at full resolution makes a
 * pattern too fine to see and the result just reads as gray. We dither small
 * and let CSS scale the canvas back up with nearest-neighbor.
 */
export function ditherResolution(
  width: number,
  height: number,
  pixelSize: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  const scale = Math.min(longest, BASE_DITHER_EDGE) / longest / Math.max(1, pixelSize)

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function toImageData(
  bits: Uint8ClampedArray,
  width: number,
  height: number,
  invert: boolean,
): ImageData {
  const image = new ImageData(width, height)

  for (let p = 0, i = 0; p < bits.length; p++, i += 4) {
    const value = invert ? 255 - bits[p] : bits[p]
    image.data[i] = value
    image.data[i + 1] = value
    image.data[i + 2] = value
    image.data[i + 3] = 255
  }

  return image
}

/** Cropped canvas in, one-bit ImageData out. Synchronous and side-effect free. */
export function renderDither(
  source: HTMLCanvasElement,
  settings: DitherSettings,
): ImageData {
  const { width, height } = ditherResolution(
    source.width,
    source.height,
    settings.pixelSize,
  )

  const small = downscaleCanvas(source, width, height)
  const gray = applyContrast(toGrayscale(readImageData(small)), settings.contrast)
  const bits = getAlgorithm(settings.algorithmId).apply(gray, small.width, small.height, {
    threshold: settings.threshold,
  })

  return toImageData(bits, small.width, small.height, settings.invert)
}
