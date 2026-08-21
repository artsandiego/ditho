import { describe, expect, it } from "vitest"

import { diffuse } from "./diffusion"
import { KERNELS } from "./kernels"
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

/** Red channel of every pixel, which is the whole story for a grey palette. */
const luma = (bitmap: Bitmap) =>
  Array.from({ length: bitmap.width * bitmap.height }, (_, p) => bitmap.data[p * 4])

describe("diffuse", () => {
  it("turns a flat mid-grey 2x2 into a checkerboard under Floyd-Steinberg", () => {
    // Hand-traced: the first pixel rounds up to white and pushes -127 of error
    // into its neighbours, which is enough to flip both of them to black.
    const out = diffuse(flat(2, 2, 128), KERNELS["floyd-steinberg"], MONO, false)

    expect(luma(out)).toEqual([255, 0, 0, 255])
  })

  it("leaves pure black and pure white untouched", () => {
    expect(luma(diffuse(flat(4, 4, 0), KERNELS["floyd-steinberg"], MONO, false))).toEqual(
      Array(16).fill(0),
    )
    expect(
      luma(diffuse(flat(4, 4, 255), KERNELS["floyd-steinberg"], MONO, false)),
    ).toEqual(Array(16).fill(255))
  })

  it("emits only palette colours, whatever the kernel", () => {
    const gray4: RGB[] = [
      [0, 0, 0],
      [85, 85, 85],
      [170, 170, 170],
      [255, 255, 255],
    ]
    const allowed = new Set(gray4.map(([r]) => r))

    for (const [id, kernel] of Object.entries(KERNELS)) {
      const source = flat(32, 32, 100)
      // A little structure so error actually moves around.
      for (let i = 0; i < source.data.length; i += 4) source.data[i] = (i / 4) % 256

      const out = diffuse(source, kernel, gray4, false)

      expect(luma(out).every((v) => allowed.has(v)), id).toBe(true)
      expect(luma(out).some(Number.isNaN), id).toBe(false)
    }
  })

  it("preserves average brightness across a flat field", () => {
    const out = diffuse(flat(128, 128, 64), KERNELS["floyd-steinberg"], MONO, false)
    const white = luma(out).filter((v) => v === 255).length

    expect(white / (128 * 128)).toBeCloseTo(64 / 255, 1)
  })

  it("throws away a quarter of the error under Atkinson", () => {
    // Atkinson's taps sum to 6 over a divisor of 8. On a flat field that lost
    // error means fewer pixels flip, so it comes out lighter than the exact
    // Floyd-Steinberg rendering of the same grey.
    const source = flat(64, 64, 96)
    const atkinsonWhite = luma(diffuse(source, KERNELS.atkinson, MONO, false)).filter(
      (v) => v === 255,
    ).length
    const floydWhite = luma(
      diffuse(source, KERNELS["floyd-steinberg"], MONO, false),
    ).filter((v) => v === 255).length

    expect(atkinsonWhite).toBeLessThan(floydWhite)
  })

  it("changes the result when scanning serpentine", () => {
    // A flat field is the wrong probe here: it checkerboards identically in
    // either direction. Serpentine only shows itself where error travels, so
    // this uses the gradient that a left-to-right scan visibly streaks.
    const source = flat(16, 16, 0)
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const value = Math.round((x / 15) * 255)
        const i = (y * 16 + x) * 4
        source.data[i] = value
        source.data[i + 1] = value
        source.data[i + 2] = value
      }
    }

    const straight = luma(diffuse(source, KERNELS["floyd-steinberg"], MONO, false))
    const snake = luma(diffuse(source, KERNELS["floyd-steinberg"], MONO, true))

    expect(snake).not.toEqual(straight)
    expect(snake.every((v) => v === 0 || v === 255)).toBe(true)
  })

  it("does not mutate the input", () => {
    const source = flat(4, 4, 90)
    const before = Array.from(source.data)

    diffuse(source, KERNELS["floyd-steinberg"], MONO, false)

    expect(Array.from(source.data)).toEqual(before)
  })

  it("handles a single pixel without running off the edge", () => {
    expect(luma(diffuse(flat(1, 1, 200), KERNELS.stucki, MONO, false))).toEqual([255])
  })
})
