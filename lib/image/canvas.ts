export function createCanvas(width: number, height: number): HTMLCanvasElement {
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
