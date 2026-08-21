import { describe, expect, it } from "vitest"

import { clampPan, letterbox, zoomAbout } from "./fit"

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

describe("clampPan", () => {
  it("centres content smaller than its container", () => {
    expect(clampPan(-999, 400, 1000)).toBe(300)
    expect(clampPan(50, 400, 1000)).toBe(300)
  })

  it("never leaves a gap once the content is larger", () => {
    expect(clampPan(200, 1500, 1000)).toBe(0)
    expect(clampPan(-900, 1500, 1000)).toBe(-500)
  })

  it("leaves a valid position alone", () => {
    expect(clampPan(-250, 1500, 1000)).toBe(-250)
  })
})

describe("zoomAbout", () => {
  it("holds the point under the cursor still", () => {
    const origin = -100
    const pointer = 250
    const next = zoomAbout(origin, pointer, 2, 4)

    // The same image coordinate must land back under the cursor.
    const before = (pointer - origin) / 2
    const after = (pointer - next) / 4

    expect(after).toBeCloseTo(before, 9)
  })

  it("is a no-op when the zoom does not change", () => {
    expect(zoomAbout(-100, 250, 3, 3)).toBe(-100)
  })

  it("moves toward the cursor when zooming in", () => {
    expect(zoomAbout(0, 100, 1, 2)).toBe(-100)
  })
})
