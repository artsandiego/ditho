import { context2d, createCanvas } from "./canvas"

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

export const MAX_SOURCE_EDGE = 2400

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
