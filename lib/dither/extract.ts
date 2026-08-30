import type { Bitmap, RGB } from "./types"

export const MIN_IMAGE_COLORS = 2
export const MAX_IMAGE_COLORS = 12
export const DEFAULT_IMAGE_COLORS = 6

const SAMPLE_BUDGET = 24_000

const luma = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b

function sample(image: Bitmap): RGB[] {
  const total = image.width * image.height
  if (total <= 0) return []

  const stride = Math.max(1, Math.ceil(total / SAMPLE_BUDGET))
  const out: RGB[] = []

  for (let p = 0; p < total; p += stride) {
    const i = p * 4
    if (image.data[i + 3] < 128) continue
    out.push([image.data[i], image.data[i + 1], image.data[i + 2]])
  }

  return out
}

function widestChannel(box: RGB[]): { channel: number; range: number } {
  const low: [number, number, number] = [255, 255, 255]
  const high: [number, number, number] = [0, 0, 0]

  for (const pixel of box) {
    for (let c = 0; c < 3; c++) {
      if (pixel[c] < low[c]) low[c] = pixel[c]
      if (pixel[c] > high[c]) high[c] = pixel[c]
    }
  }

  let channel = 0
  let range = high[0] - low[0]

  for (let c = 1; c < 3; c++) {
    if (high[c] - low[c] > range) {
      range = high[c] - low[c]
      channel = c
    }
  }

  return { channel, range }
}

function average(box: RGB[]): RGB {
  let r = 0
  let g = 0
  let b = 0

  for (const pixel of box) {
    r += pixel[0]
    g += pixel[1]
    b += pixel[2]
  }

  return [Math.round(r / box.length), Math.round(g / box.length), Math.round(b / box.length)]
}

export function extractPalette(image: Bitmap, count: number): RGB[] {
  const wanted = Math.max(
    MIN_IMAGE_COLORS,
    Math.min(MAX_IMAGE_COLORS, Math.round(count) || MIN_IMAGE_COLORS),
  )

  const pixels = sample(image)
  if (pixels.length === 0) return []

  const boxes: RGB[][] = [pixels]

  while (boxes.length < wanted) {
    let target = -1
    let widest = 0
    let channel = 0

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue

      const spread = widestChannel(boxes[i])
      if (spread.range > widest) {
        widest = spread.range
        channel = spread.channel
        target = i
      }
    }

    if (target === -1) break

    const box = boxes[target].slice().sort((a, b) => a[channel] - b[channel])
    const mid = box.length >> 1

    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid))
  }

  const seen = new Set<string>()
  const colors: RGB[] = []

  for (const box of boxes) {
    const color = average(box)
    const key = color.join(",")

    if (seen.has(key)) continue
    seen.add(key)
    colors.push(color)
  }

  return colors.sort((a, b) => luma(a) - luma(b))
}
