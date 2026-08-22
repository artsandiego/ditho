import { describe, expect, it } from "vitest"

import { spotlight, tinted } from "./reveal"

const REACH = 100

describe("spotlight", () => {
  it("is full strength under the cursor", () => {
    expect(spotlight(0, REACH)).toBe(1)
  })

  it("is nothing at and beyond its reach", () => {
    expect(spotlight(REACH * REACH, REACH)).toBe(0)
    expect(spotlight(400 * 400, REACH)).toBe(0)
  })

  it("falls away steadily in between", () => {
    const at = (d: number) => spotlight(d * d, REACH)

    expect(at(25)).toBeGreaterThan(at(50))
    expect(at(50)).toBeGreaterThan(at(75))
    expect(at(75)).toBeGreaterThan(at(99))
  })

  it("stays within 0 and 1 at any distance", () => {
    for (let d = 0; d <= 300; d += 7) {
      const value = spotlight(d * d, REACH)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it("has no reach to speak of when given none", () => {
    expect(spotlight(0, 0)).toBe(0)
    expect(spotlight(100, -5)).toBe(0)
  })
})

describe("tinted", () => {
  it("always colours the point under the cursor", () => {
    for (const noise of [0, 0.25, 0.5, 0.9, 0.999]) {
      expect(tinted(1, noise), `noise ${noise}`).toBe(true)
    }
  })

  it("leaves untouched background alone", () => {
    for (const noise of [0, 0.25, 0.5, 0.9]) {
      expect(tinted(0, noise), `noise ${noise}`).toBe(false)
    }
  })

  it("dissolves across the transition rather than cutting at one line", () => {
    // Half strength should colour roughly half the dots it falls on — that
    // spread is the dithered edge.
    const samples = 200
    let coloured = 0
    for (let i = 0; i < samples; i++) {
      if (tinted(0.5, i / samples)) coloured++
    }

    expect(coloured / samples).toBeCloseTo(0.5, 1)
  })

  it("colours more as the tint rises", () => {
    const share = (tint: number) => {
      let n = 0
      for (let i = 0; i < 100; i++) if (tinted(tint, i / 100)) n++
      return n
    }

    expect(share(0.8)).toBeGreaterThan(share(0.4))
    expect(share(0.4)).toBeGreaterThan(share(0.1))
  })
})
