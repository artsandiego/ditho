import { describe, expect, it } from "vitest"

import { letterbox } from "./fit"

const box = { width: 1000, height: 600 }

describe("letterbox", () => {
  it("fills the width when the content is wider than the box", () => {
    expect(letterbox(box, 2)).toEqual({ width: 1000, height: 500 })
  })

  it("fills the height when the content is taller than the box", () => {
    expect(letterbox(box, 1)).toEqual({ width: 600, height: 600 })
  })

  it("fills both when the ratios match", () => {
    expect(letterbox(box, 1000 / 600)).toEqual({ width: 1000, height: 600 })
  })

  it("never overflows the box, at any ratio", () => {
    for (const aspect of [0.1, 0.25, 0.5, 0.85, 1, 1.778, 4, 12]) {
      const fit = letterbox(box, aspect)

      expect(fit.width, String(aspect)).toBeLessThanOrEqual(box.width + 1e-9)
      expect(fit.height, String(aspect)).toBeLessThanOrEqual(box.height + 1e-9)
      expect(fit.width / fit.height, String(aspect)).toBeCloseTo(aspect, 6)
    }
  })

  it("keeps the requested ratio rather than the container's", () => {
    // The regression this guards: a 100x400 dither grid displayed for a square
    // photograph must come out square, not 1:4.
    const fit = letterbox({ width: 1040, height: 764 }, 1)

    expect(fit.width).toBe(fit.height)
  })
})
