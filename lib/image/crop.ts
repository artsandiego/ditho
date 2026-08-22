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
/**
 * Whether a crop rect is usable. The cropper reports nonsense if it is measured
 * before the browser has given it a box — a zero-height viewport, a stage that
 * has not laid out yet — and every number downstream inherits the NaN.
 */
export function isUsableCrop(crop: PixelCrop | null): crop is PixelCrop {
  return (
    crop !== null &&
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    Number.isFinite(crop.width) &&
    Number.isFinite(crop.height) &&
    crop.width >= 1 &&
    crop.height >= 1
  )
}

export function cropToCanvas(
  // Widened from HTMLImageElement so a decoded video frame or an offscreen
  // canvas can be cropped by exactly the same code. It is only ever handed to
  // drawImage, which already accepts the wider type.
  image: CanvasImageSource,
  crop: PixelCrop,
): HTMLCanvasElement {
  if (!isUsableCrop(crop)) {
    throw new Error("That crop could not be measured. Try resizing the window.")
  }

  const sourceWidth = Math.max(1, Math.round(crop.width))
  const sourceHeight = Math.max(1, Math.round(crop.height))
  const scale = Math.min(1, MAX_SOURCE_EDGE / Math.max(sourceWidth, sourceHeight))

  const canvas = createCanvas(sourceWidth * scale, sourceHeight * scale)
  const ctx = context2d(canvas)

  // Flatten onto white so a PNG cutout reads as paper rather than as black.
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

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
