import type { Bitmap, HalftoneShape, RGB } from "./types"

const LUMA_R = 0.299
const LUMA_G = 0.587
const LUMA_B = 0.114

export function luminance(r: number, g: number, b: number): number {
  return LUMA_R * r + LUMA_G * g + LUMA_B * b
}

const clamp = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v)

function blurredLuminance(image: Bitmap, radius: number): Float32Array {
  const { width, height, data } = image
  const source = new Float32Array(width * height)

  for (let p = 0; p < source.length; p++) {
    source[p] = luminance(data[p * 4], data[p * 4 + 1], data[p * 4 + 2])
  }

  if (radius < 1) return source

  const span = radius * 2 + 1
  const horizontal = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    const row = y * width
    let sum = 0
    for (let x = -radius; x <= radius; x++) sum += source[row + clamp(x, width - 1)]

    for (let x = 0; x < width; x++) {
      horizontal[row + x] = sum / span
      sum -= source[row + clamp(x - radius, width - 1)]
      sum += source[row + clamp(x + radius + 1, width - 1)]
    }
  }

  const out = new Float32Array(width * height)

  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = -radius; y <= radius; y++) sum += horizontal[clamp(y, height - 1) * width + x]

    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / span
      sum -= horizontal[clamp(y - radius, height - 1) * width + x]
      sum += horizontal[clamp(y + radius + 1, height - 1) * width + x]
    }
  }

  return out
}

export interface HalftoneOptions {
  palette: RGB[]
  cellSize: number
  angle: number
  shape: HalftoneShape
  cellAspect: number
}

function extent(shape: HalftoneShape, coverage: number, cell: number): number {
  switch (shape) {
    case "circle": {
      const inscribed = Math.PI / 4
      if (coverage <= inscribed) return cell * Math.sqrt(coverage / Math.PI)
      const past = (coverage - inscribed) / (1 - inscribed)
      return cell * (0.5 + past * (Math.SQRT1_2 - 0.5))
    }
    case "square":
      return (cell * Math.sqrt(coverage)) / 2
    case "diamond": {
      const inscribed = 0.5
      if (coverage <= inscribed) return cell * Math.sqrt(coverage / 2)
      const past = (coverage - inscribed) / (1 - inscribed)
      return cell * (0.5 + past * 0.5)
    }
    case "line":
      return (coverage * cell) / 2
  }
}

function covered(shape: HalftoneShape, du: number, dv: number, size: number): boolean {
  switch (shape) {
    case "circle":
      return du * du + dv * dv <= size * size
    case "square":
      return Math.max(Math.abs(du), Math.abs(dv)) <= size
    case "diamond":
      return Math.abs(du) + Math.abs(dv) <= size
    case "line":
      return Math.abs(dv) <= size
  }
}

export function halftone(image: Bitmap, options: HalftoneOptions): Bitmap {
  const { width, height, data } = image
  const { palette, shape, angle } = options
  const cell = Math.max(2, options.cellSize)
  const aspect = Math.max(0.05, options.cellAspect)

  const out = new Uint8ClampedArray(width * height * 4)

  const ramp = [...palette]
    .map((color) => ({ color, lum: luminance(color[0], color[1], color[2]) }))
    .sort((a, b) => a.lum - b.lum)

  if (ramp.length === 1) {
    for (let i = 0; i < out.length; i += 4) {
      out[i] = ramp[0].color[0]
      out[i + 1] = ramp[0].color[1]
      out[i + 2] = ramp[0].color[2]
      out[i + 3] = 255
    }
    return { data: out, width, height }
  }

  const tone = blurredLuminance({ data, width, height }, Math.max(1, Math.round(cell / 2)))

  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const cellWidth = cell * aspect

  for (let y = 0; y < height; y++) {
    const py = y - halfHeight

    for (let x = 0; x < width; x++) {
      const px = x - halfWidth

      const u = px * cos + py * sin
      const v = -px * sin + py * cos

      const centreU = (Math.floor(u / cellWidth) + 0.5) * cellWidth
      const centreV = (Math.floor(v / cell) + 0.5) * cell

      const sampleX = clamp(Math.round(centreU * cos - centreV * sin + halfWidth), width - 1)
      const sampleY = clamp(Math.round(centreU * sin + centreV * cos + halfHeight), height - 1)
      const value = tone[sampleY * width + sampleX]

      let lower = 0
      while (lower < ramp.length - 2 && ramp[lower + 1].lum < value) lower++
      const upper = lower + 1
      const gap = ramp[upper].lum - ramp[lower].lum
      const coverage =
        gap <= 0 ? 1 : Math.min(1, Math.max(0, (ramp[upper].lum - value) / gap))

      const du = (u - centreU) / aspect
      const dv = v - centreV

      const color = covered(shape, du, dv, extent(shape, coverage, cell))
        ? ramp[lower].color
        : ramp[upper].color

      const i = (y * width + x) * 4
      out[i] = color[0]
      out[i + 1] = color[1]
      out[i + 2] = color[2]
      out[i + 3] = 255
    }
  }

  return { data: out, width, height }
}
