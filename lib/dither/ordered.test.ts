import { describe, expect, it } from "vitest"

import { getMatrix, MATRICES } from "./matrices"
import { ordered } from "./ordered"
import type { Bitmap, RGB } from "./types"

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

const luma = (bitmap: Bitmap) =>
  Array.from({ length: bitmap.width * bitmap.height }, (_, p) => bitmap.data[p * 4])

describe("Bayer matrices", () => {
  it("uses every threshold exactly once", () => {
    for (const matrix of MATRICES.filter((m) => m.id.startsWith("bayer"))) {
      const total = matrix.size * matrix.size
      const seen = new Set(matrix.values.map((v) => Math.round(v * total)))

      expect(seen.size, matrix.id).toBe(total)
    }
  })

  it("keeps every threshold inside [0, 1)", () => {
    for (const matrix of MATRICES) {
      expect(matrix.values.every((v) => v >= 0 && v < 1), matrix.id).toBe(true)
      expect(matrix.values.length, matrix.id).toBe(matrix.size * matrix.size)
    }
  })
})

describe("ordered", () => {
  it("renders a flat mid-grey as an even checkerboard under Bayer 2x2", () => {
    // 127, not 128: true mid-grey between 0 and 255 is 127.5, and Bayer 2x2
    // only offers four threshold steps, so half a level either way visibly
    // tips the balance.
    const out = luma(ordered(flat(4, 4, 127), getMatrix("bayer-2"), MONO, 1))

    expect(out.filter((v) => v === 255).length).toBe(8)
  })

  it("holds a mid-grey near 50% under the finer Bayer 8x8", () => {
    const out = luma(ordered(flat(32, 32, 128), getMatrix("bayer-8"), MONO, 1))

    expect(out.filter((v) => v === 255).length / out.length).toBeCloseTo(0.5, 1)
  })

  it("keeps black black and white white", () => {
    expect(luma(ordered(flat(8, 8, 0), getMatrix("bayer-4"), MONO, 1))).toEqual(
      Array(64).fill(0),
    )
    expect(luma(ordered(flat(8, 8, 255), getMatrix("bayer-4"), MONO, 1))).toEqual(
      Array(64).fill(255),
    )
  })

  it("tiles: the same source pixel one matrix period away resolves the same", () => {
    const matrix = getMatrix("bayer-4")
    const out = luma(ordered(flat(8, 8, 120), matrix, MONO, 1))

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(out[y * 8 + x]).toBe(out[y * 8 + x + 4])
        expect(out[y * 8 + x]).toBe(out[(y + 4) * 8 + x])
      }
    }
  })

  it("collapses toward flat quantisation as strength drops to zero", () => {
    const out = luma(ordered(flat(8, 8, 140), getMatrix("bayer-8"), MONO, 0))

    expect(new Set(out).size).toBe(1)
  })

  it("emits only palette colours for every matrix", () => {
    const gray4: RGB[] = [
      [0, 0, 0],
      [85, 85, 85],
      [170, 170, 170],
      [255, 255, 255],
    ]
    const allowed = new Set(gray4.map(([r]) => r))

    for (const matrix of MATRICES) {
      const out = luma(ordered(flat(24, 24, 130), matrix, gray4, 1))
      expect(out.every((v) => allowed.has(v)), matrix.id).toBe(true)
    }
  })

  it("does not mutate the input", () => {
    const source = flat(4, 4, 90)
    const before = Array.from(source.data)

    ordered(source, getMatrix("bayer-4"), MONO, 1)

    expect(Array.from(source.data)).toEqual(before)
  })
})
