import { describe, expect, it } from "vitest"

import {
  extractPalette,
  MAX_IMAGE_COLORS,
  MIN_IMAGE_COLORS,
} from "./extract"
import type { Bitmap, RGB } from "./types"

/** One row of pixels, each given explicitly as RGBA. */
function fromPixels(pixels: readonly (readonly [number, number, number, number])[]): Bitmap {
  const data = new Uint8ClampedArray(pixels.length * 4)

  pixels.forEach((pixel, i) => {
    data[i * 4] = pixel[0]
    data[i * 4 + 1] = pixel[1]
    data[i * 4 + 2] = pixel[2]
    data[i * 4 + 3] = pixel[3]
  })

  return { data, width: pixels.length, height: 1 }
}

/** An opaque row holding `repeat` copies of each color. */
function fromColors(colors: readonly RGB[], repeat: number): Bitmap {
  return fromPixels(
    colors.flatMap((color) =>
      Array.from({ length: repeat }, () => [color[0], color[1], color[2], 255] as const),
    ),
  )
}

const luma = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b

const BLACK: RGB = [0, 0, 0]
const WHITE: RGB = [255, 255, 255]

describe("extractPalette", () => {
  it("splits an even two-tone image into exactly those two tones", () => {
    expect(extractPalette(fromColors([BLACK, WHITE], 50), 2)).toEqual([BLACK, WHITE])
  })

  it("recovers an even grey ramp exactly", () => {
    // Median cut splits at the median sample rather than the midpoint of the
    // range, so an evenly populated ramp separates cleanly into its own levels.
    const ramp: RGB[] = [
      [0, 0, 0],
      [85, 85, 85],
      [170, 170, 170],
      [255, 255, 255],
    ]

    expect(extractPalette(fromColors(ramp, 25), 4)).toEqual(ramp)
  })

  it("returns colors dark to light", () => {
    const messy: RGB[] = [
      [230, 220, 200],
      [12, 18, 40],
      [180, 60, 40],
      [90, 140, 120],
      [40, 40, 44],
    ]

    const out = extractPalette(fromColors(messy, 20), 5)

    for (let i = 1; i < out.length; i++) {
      expect(luma(out[i - 1])).toBeLessThanOrEqual(luma(out[i]))
    }
  })

  it("never returns more colors than asked for", () => {
    const spread: RGB[] = Array.from(
      { length: 40 },
      (_, i) => [i * 6, 255 - i * 6, (i * 13) % 256] as RGB,
    )

    for (let count = MIN_IMAGE_COLORS; count <= MAX_IMAGE_COLORS; count++) {
      expect(extractPalette(fromColors(spread, 3), count).length, `count ${count}`)
        .toBeLessThanOrEqual(count)
    }
  })

  it("returns fewer rather than padding with duplicates", () => {
    // A flat frame holds one color. Handing back eight copies of it would give
    // the kernels a palette of identical entries to choose between.
    expect(extractPalette(fromColors([[24, 90, 140]], 200), 8)).toEqual([[24, 90, 140]])
  })

  it("invents no color outside the range present in the image", () => {
    const source: RGB[] = [
      [10, 20, 30],
      [60, 70, 80],
      [110, 120, 130],
    ]

    for (const color of extractPalette(fromColors(source, 30), 6)) {
      for (let c = 0; c < 3; c++) {
        const low = Math.min(...source.map((s) => s[c]))
        const high = Math.max(...source.map((s) => s[c]))

        expect(color[c], `channel ${c} of ${color}`).toBeGreaterThanOrEqual(low)
        expect(color[c], `channel ${c} of ${color}`).toBeLessThanOrEqual(high)
      }
    }
  })

  it("clamps the requested count into range", () => {
    const spread: RGB[] = Array.from(
      { length: 30 },
      (_, i) => [i * 8, i * 3, 255 - i * 8] as RGB,
    )
    const image = fromColors(spread, 4)

    for (const tooFew of [0, 1, -5, Number.NaN]) {
      expect(extractPalette(image, tooFew).length, String(tooFew)).toBe(MIN_IMAGE_COLORS)
    }

    expect(extractPalette(image, 999).length).toBeLessThanOrEqual(MAX_IMAGE_COLORS)
  })

  it("ignores near-transparent pixels", () => {
    // Red is present in the buffer but fully transparent, so it must not reach
    // the palette.
    const image = fromPixels([
      [255, 0, 0, 0],
      [255, 0, 0, 0],
      [0, 0, 0, 255],
      [0, 0, 0, 255],
    ])

    expect(extractPalette(image, 4)).toEqual([BLACK])
  })

  it("returns nothing for an empty image", () => {
    expect(extractPalette({ data: new Uint8ClampedArray(0), width: 0, height: 0 }, 4)).toEqual(
      [],
    )
  })

  it("is deterministic, so the palette does not shift between renders", () => {
    const image = fromColors(
      [
        [200, 30, 60],
        [20, 80, 160],
        [240, 230, 210],
        [15, 15, 20],
      ],
      40,
    )

    expect(extractPalette(image, 6)).toEqual(extractPalette(image, 6))
  })

  it("does not mutate the image it reads", () => {
    const image = fromColors([BLACK, WHITE, [128, 64, 32]], 12)
    const before = Array.from(image.data)

    extractPalette(image, 5)

    expect(Array.from(image.data)).toEqual(before)
  })
})
