import { describe, expect, it } from "vitest"

import { halftone } from "./halftone"
import type { Bitmap, HalftoneShape, RGB } from "./types"

const MONO: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
]

function flat(width: number, height: number, value: number): Bitmap {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }
  return { data, width, height }
}

const base = { palette: MONO, cellSize: 8, angle: 45, shape: "circle" as HalftoneShape, cellAspect: 1 }
const inkFraction = (bitmap: Bitmap) => {
  let ink = 0
  for (let p = 0; p < bitmap.width * bitmap.height; p++) if (bitmap.data[p * 4] === 0) ink++
  return ink / (bitmap.width * bitmap.height)
}

describe("halftone", () => {
  it("floods solid black and leaves solid white empty", () => {
    expect(inkFraction(halftone(flat(64, 64, 0), base))).toBe(1)
    expect(inkFraction(halftone(flat(64, 64, 255), base))).toBe(0)
  })

  it("lays down ink in rough proportion to darkness", () => {
    for (const [value, expected] of [
      [64, 0.75],
      [128, 0.5],
      [191, 0.25],
    ]) {
      expect(inkFraction(halftone(flat(96, 96, value), base)), String(value)).toBeCloseTo(
        expected,
        1,
      )
    }
  })

  it("matches coverage across shapes, since the radii are area-matched", () => {
    const shapes: HalftoneShape[] = ["circle", "square", "diamond", "line"]
    const coverage = shapes.map((shape) =>
      inkFraction(halftone(flat(96, 96, 128), { ...base, shape })),
    )

    for (const value of coverage) expect(value).toBeCloseTo(0.5, 1)
  })

  it("produces a different screen at a different angle", () => {
    const flatSource = flat(64, 64, 128)
    const a = Array.from(halftone(flatSource, { ...base, angle: 0 }).data)
    const b = Array.from(halftone(flatSource, { ...base, angle: 30 }).data)

    expect(a).not.toEqual(b)
  })

  it("dots between adjacent levels of a multi-level palette", () => {
    const gray4: RGB[] = [
      [0, 0, 0],
      [85, 85, 85],
      [170, 170, 170],
      [255, 255, 255],
    ]
    // A tone sitting between 85 and 170 must be screened from those two levels,
    // never from pure black or white.
    const out = halftone(flat(96, 96, 128), { ...base, palette: gray4 })
    const seen = new Set(
      Array.from({ length: 96 * 96 }, (_, p) => out.data[p * 4]),
    )

    expect([...seen].sort((a, b) => a - b)).toEqual([85, 170])
  })

  it("emits only palette colors", () => {
    const out = halftone(flat(48, 48, 100), base)
    const seen = new Set(Array.from({ length: 48 * 48 }, (_, p) => out.data[p * 4]))

    expect([...seen].every((v) => v === 0 || v === 255)).toBe(true)
  })

  it("does not mutate the input", () => {
    const source = flat(32, 32, 120)
    const before = Array.from(source.data)

    halftone(source, base)

    expect(Array.from(source.data)).toEqual(before)
  })
})
