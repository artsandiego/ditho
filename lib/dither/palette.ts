import type { Palette, RGB } from "./types"

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

const ramp = (steps: number): RGB[] =>
  Array.from({ length: steps }, (_, i) => {
    const v = Math.round((i / (steps - 1)) * 255)
    return [v, v, v] as RGB
  })

export const PALETTES: Palette[] = [
  { id: "mono", name: "Mono", colors: [[0, 0, 0], [255, 255, 255]] },
  { id: "gray-4", name: "Grey · 4", colors: ramp(4) },
  { id: "gray-8", name: "Grey · 8", colors: ramp(8) },
  {
    id: "gameboy",
    name: "Game Boy",
    colors: [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15],
    ],
  },
  {
    id: "cga",
    name: "CGA",
    colors: [
      [0, 0, 0],
      [85, 255, 255],
      [255, 85, 255],
      [255, 255, 255],
    ],
  },
  {
    id: "c64",
    name: "Commodore 64",
    colors: [
      [0, 0, 0],
      [255, 255, 255],
      [136, 57, 50],
      [103, 182, 189],
      [139, 63, 150],
      [85, 160, 73],
      [64, 49, 141],
      [191, 206, 114],
      [139, 84, 41],
      [87, 66, 0],
      [184, 105, 98],
      [80, 80, 80],
      [120, 120, 120],
      [148, 224, 137],
      [120, 105, 196],
      [159, 159, 159],
    ],
  },
  {
    id: "solar",
    name: "Solar",
    colors: [
      [24, 12, 8],
      [122, 32, 24],
      [224, 96, 32],
      [248, 184, 88],
      [255, 245, 214],
    ],
  },
  {
    id: "blueprint",
    name: "Blueprint",
    colors: [
      [8, 20, 48],
      [24, 62, 122],
      [72, 132, 198],
      [176, 214, 240],
    ],
  },
  {
    id: "rgb-8",
    name: "RGB · 8",
    colors: [
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [255, 0, 255],
      [0, 255, 255],
      [255, 255, 255],
    ],
  },
]

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

export function nearestColor(palette: RGB[], r: number, g: number, b: number): RGB {
  let best = palette[0]
  let bestDistance = Infinity

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i]
    const dr = r - color[0]
    const dg = g - color[1]
    const db = b - color[2]
    const distance = 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db

    if (distance < bestDistance) {
      bestDistance = distance
      best = color
    }
  }

  return best
}

export interface Bracket {
  dark: RGB
  light: RGB
  t: number
}

export function bracketColors(
  palette: RGB[],
  r: number,
  g: number,
  b: number,
): Bracket {
  if (palette.length === 1) return { dark: palette[0], light: palette[0], t: 0 }

  let firstIndex = 0
  let first = Infinity
  let secondIndex = 1
  let second = Infinity

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i]
    const dr = r - color[0]
    const dg = g - color[1]
    const db = b - color[2]
    const distance = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db)

    if (distance < first) {
      second = first
      secondIndex = firstIndex
      first = distance
      firstIndex = i
    } else if (distance < second) {
      second = distance
      secondIndex = i
    }
  }

  const a = palette[firstIndex]
  const c = palette[secondIndex]
  const aLum = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]
  const cLum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

  const darkFirst = aLum <= cLum
  const dark = darkFirst ? a : c
  const light = darkFirst ? c : a
  const toDark = darkFirst ? first : second
  const toLight = darkFirst ? second : first
  const total = toDark + toLight

  return { dark, light, t: total === 0 ? 0 : toDark / total }
}
