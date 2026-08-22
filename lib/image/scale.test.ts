import { describe, expect, it } from "vitest"

import { exportScales } from "./scale"

describe("exportScales", () => {
  it("returns whole numbers", () => {
    for (const [w, h, aspect] of [
      [400, 225, 16 / 9],
      [100, 400, 1],
      [37, 91, 1.4],
      [1200, 675, 16 / 9],
    ] as const) {
      const { x, y } = exportScales(w, h, aspect, 2048)
      expect(Number.isInteger(x), `${w}x${h}`).toBe(true)
      expect(Number.isInteger(y), `${w}x${h}`).toBe(true)
      expect(x).toBeGreaterThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(1)
    }
  })

  it("keeps the long edge within the target", () => {
    for (const [w, h, aspect] of [
      [400, 225, 16 / 9],
      [150, 84, 16 / 9],
      [43, 96, 16 / 9],
    ] as const) {
      const { x, y } = exportScales(w, h, aspect, 2048)
      expect(Math.max(w * x, h * y), `${w}x${h}`).toBeLessThanOrEqual(2048)
    }
  })

  it("scales a square grid evenly when the source is square", () => {
    expect(exportScales(400, 400, 1, 2048)).toEqual({ x: 5, y: 5 })
  })

  it("stretches a non-square grid back toward the source's proportions", () => {
    // A 100x400 grid standing in for a square photograph: the axes must differ to
    // undo the cell stretch, not scale together.
    const { x, y } = exportScales(100, 400, 1, 2048)

    expect(x).toBeGreaterThan(y)
    expect((100 * x) / (400 * y)).toBeCloseTo(1, 1)
  })

  it("lands the aspect within a couple of percent, which is the cost of whole numbers", () => {
    for (const [w, h, aspect] of [
      [400, 225, 16 / 9],
      [43, 96, 16 / 9],
      [150, 84, 16 / 9],
      [200, 113, 16 / 9],
    ] as const) {
      const { x, y } = exportScales(w, h, aspect, 2048)
      const got = (w * x) / (h * y)
      expect(Math.abs(got - aspect) / aspect, `${w}x${h}`).toBeLessThan(0.03)
    }
  })

  it("still corrects the aspect when one step already fills the target", () => {
    // A grid this wide cannot grow at all, but the axes must still differ or
    // the output would come out with the wrong proportions entirely.
    const { x, y } = exportScales(1600, 200, 1, 2048)

    expect(y).toBeGreaterThan(x)
  })
})
