import { context2d, createCanvas } from "./canvas"

/** Pixel-space crop rect, matching what react-easy-crop hands back. */
export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A 48MP phone photo does not need to sit in memory at full size to be
 * dithered, and the ditherer never renders above this anyway.
 */
export const MAX_SOURCE_EDGE = 2400

/**
 * Extract the crop rect into its own canvas, capped at MAX_SOURCE_EDGE.
 *
 * This canvas is the pipeline's source of truth: it is produced once when the
 * user confirms a crop, then re-read every time a slider moves.
 */
export function cropToCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
): HTMLCanvasElement {
  const sourceWidth = Math.max(1, Math.round(crop.width))
  const sourceHeight = Math.max(1, Math.round(crop.height))
  const scale = Math.min(1, MAX_SOURCE_EDGE / Math.max(sourceWidth, sourceHeight))

  const canvas = createCanvas(sourceWidth * scale, sourceHeight * scale)
  const ctx = context2d(canvas)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(
    image,
    Math.round(crop.x),
    Math.round(crop.y),
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return canvas
}
