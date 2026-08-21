export function createCanvas(width: number, height: number): HTMLCanvasElement {
  // Math.max(1, NaN) is NaN, which a canvas silently accepts as 0 and only
  // complains about several draw calls later. Fail here, where the bad number
  // came from, instead of at some downstream drawImage.
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Canvas needs finite dimensions, got ${width}x${height}.`)
  }

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function context2d(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", options)
  if (!ctx) throw new Error("This browser could not provide a 2D canvas context.")
  return ctx
}

/**
 * Downscale by repeated halving rather than one big jump.
 *
 * A single drawImage from 2400px to 75px samples too sparsely and turns fine
 * detail into aliased speckle, which the ditherer then faithfully renders as
 * noise. Halving keeps every source pixel contributing.
 */
export function downscaleCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const width = Math.max(1, Math.round(targetWidth))
  const height = Math.max(1, Math.round(targetHeight))

  let current = source
  let currentWidth = source.width
  let currentHeight = source.height

  while (currentWidth > width * 2 && currentHeight > height * 2) {
    const stepWidth = Math.max(width, Math.floor(currentWidth / 2))
    const stepHeight = Math.max(height, Math.floor(currentHeight / 2))
    const step = createCanvas(stepWidth, stepHeight)
    const ctx = context2d(step)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(current, 0, 0, stepWidth, stepHeight)
    current = step
    currentWidth = stepWidth
    currentHeight = stepHeight
  }

  if (currentWidth === width && currentHeight === height) return current

  const out = createCanvas(width, height)
  const ctx = context2d(out, { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(current, 0, 0, width, height)
  return out
}

export function readImageData(canvas: HTMLCanvasElement): ImageData {
  return context2d(canvas, { willReadFrequently: true }).getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )
}
