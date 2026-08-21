import { describe, expect, it } from "vitest"

import { ditherFloydSteinberg } from "./floyd-steinberg"

const fill = (length: number, value: number) => new Float32Array(length).fill(value)

describe("ditherFloydSteinberg", () => {
  it("turns a flat mid-gray 2x2 into a checkerboard", () => {
    // Hand-traced: the first pixel rounds up to 255 and pushes -127 of error
    // into its neighbors, which is enough to flip both of them to black.
    const out = ditherFloydSteinberg(fill(4, 128), 2, 2, 128)

    expect(Array.from(out)).toEqual([255, 0, 0, 255])
  })

  it("leaves pure black and pure white untouched", () => {
    expect(Array.from(ditherFloydSteinberg(fill(16, 0), 4, 4, 128))).toEqual(
      Array(16).fill(0),
    )
    expect(Array.from(ditherFloydSteinberg(fill(16, 255), 4, 4, 128))).toEqual(
      Array(16).fill(255),
    )
  })

  it("only ever emits 0 or 255", () => {
    const gray = new Float32Array(64 * 64)
    for (let i = 0; i < gray.length; i++) gray[i] = (i * 37) % 256

    const out = ditherFloydSteinberg(gray, 64, 64, 128)

    expect(out.every((v) => v === 0 || v === 255)).toBe(true)
  })

  it("preserves average brightness across a flat field", () => {
    const size = 128
    const out = ditherFloydSteinberg(fill(size * size, 64), size, size, 128)
    const white = out.reduce((n, v) => n + (v === 255 ? 1 : 0), 0)

    // A 25% gray field should come out roughly 25% white pixels.
    expect(white / out.length).toBeCloseTo(64 / 255, 1)
  })

  it("gets darker as the threshold rises", () => {
    const size = 64
    const gray = new Float32Array(size * size)
    for (let i = 0; i < gray.length; i++) gray[i] = (i % size) * 4

    const blackAt = (threshold: number) =>
      ditherFloydSteinberg(gray, size, size, threshold).reduce(
        (n, v) => n + (v === 0 ? 1 : 0),
        0,
      )

    // Note this is monotonic rather than absolute: at threshold 0 the diffused
    // error can still drive a pixel negative, so "all white" is not a promise
    // the algorithm makes.
    expect(blackAt(32)).toBeLessThan(blackAt(128))
    expect(blackAt(128)).toBeLessThan(blackAt(224))
  })

  it("does not mutate the input buffer", () => {
    const gray = fill(16, 90)

    ditherFloydSteinberg(gray, 4, 4, 128)

    expect(Array.from(gray)).toEqual(Array(16).fill(90))
  })

  it("never produces NaN, even on a single-pixel image", () => {
    expect(Array.from(ditherFloydSteinberg(fill(1, 200), 1, 1, 128))).toEqual([255])
  })
})
