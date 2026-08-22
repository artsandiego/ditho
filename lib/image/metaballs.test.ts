import { describe, expect, it } from "vitest"

import { fieldAt, repulsion, shade, SURFACE, type Blob } from "./metaballs"

const REACH = 100
const PUSH = 50

describe("repulsion", () => {
  it("does nothing without a pointer", () => {
    expect(repulsion({ x: 10, y: 10 }, null, REACH, PUSH)).toEqual({ x: 0, y: 0 })
  })

  it("does nothing beyond its reach", () => {
    expect(repulsion({ x: 200, y: 0 }, { x: 0, y: 0 }, REACH, PUSH)).toEqual({ x: 0, y: 0 })
  })

  it("pushes directly away from the pointer", () => {
    const shove = repulsion({ x: 50, y: 0 }, { x: 0, y: 0 }, REACH, PUSH)

    expect(shove.x).toBeGreaterThan(0)
    expect(shove.y).toBe(0)
  })

  it("pushes harder the closer the pointer gets", () => {
    const far = repulsion({ x: 80, y: 0 }, { x: 0, y: 0 }, REACH, PUSH)
    const near = repulsion({ x: 20, y: 0 }, { x: 0, y: 0 }, REACH, PUSH)

    expect(near.x).toBeGreaterThan(far.x)
  })

  it("never shoves further than the given push, and fades out at the edge", () => {
    for (let d = 0; d <= REACH; d += 5) {
      const shove = repulsion({ x: d, y: 0 }, { x: 0, y: 0 }, REACH, PUSH)
      expect(Math.hypot(shove.x, shove.y)).toBeLessThanOrEqual(PUSH + 1e-9)
    }
    expect(repulsion({ x: REACH, y: 0 }, { x: 0, y: 0 }, REACH, PUSH)).toEqual({ x: 0, y: 0 })
  })

  it("has no direction to push when the pointer is dead centre", () => {
    const shove = repulsion({ x: 10, y: 10 }, { x: 10, y: 10 }, REACH, PUSH)

    expect(shove).toEqual({ x: 0, y: 0 })
    expect(Number.isNaN(shove.x)).toBe(false)
  })
})

describe("fieldAt", () => {
  const lone: Blob[] = [{ x: 0, y: 0, radius: 40 }]

  it("puts a lone blob's surface exactly on its radius", () => {
    expect(fieldAt(lone, 40, 0)).toBeCloseTo(SURFACE, 2)
    expect(fieldAt(lone, 0, 40)).toBeCloseTo(SURFACE, 2)
  })

  it("draws a circle: the surface sits at the same distance in every direction", () => {
    // The regression this guards. An inverse-square kernel makes this outline
    // sag toward whatever else is on the canvas; a compact bump keeps it round.
    const neighbour: Blob[] = [...lone, { x: 150, y: 0, radius: 40 }]

    for (const degrees of [0, 30, 45, 90, 135, 180, 225, 270, 315]) {
      const angle = (degrees * Math.PI) / 180
      const x = 40 * Math.cos(angle)
      const y = 40 * Math.sin(angle)

      expect(fieldAt(lone, x, y), `lone at ${degrees}°`).toBeCloseTo(SURFACE, 2)
      expect(fieldAt(neighbour, x, y), `with a neighbour at ${degrees}°`).toBeCloseTo(
        SURFACE,
        2,
      )
    }
  })

  it("reaches zero rather than trailing off forever", () => {
    expect(fieldAt(lone, 40 * 2.2, 0)).toBe(0)
    expect(fieldAt(lone, 500, 0)).toBe(0)
  })

  it("falls away with distance and peaks at the centre", () => {
    expect(fieldAt(lone, 0, 0)).toBeCloseTo(1, 6)
    expect(fieldAt(lone, 0, 0)).toBeGreaterThan(fieldAt(lone, 20, 0))
    expect(fieldAt(lone, 20, 0)).toBeGreaterThan(fieldAt(lone, 80, 0))
  })

  it("bridges the gap once two blobs come close", () => {
    // Neither reaches the midpoint alone, but together they clear the surface —
    // which is what makes them visibly fuse rather than pass as two discs. The
    // bridge forms a little before the circles themselves touch, at a gap of
    // 80, which is the bulge that makes a merge read as a merge.
    const pair: Blob[] = [
      { x: 0, y: 0, radius: 40 },
      { x: 95, y: 0, radius: 40 },
    ]

    expect(fieldAt([pair[0]], 47.5, 0)).toBeLessThan(SURFACE)
    expect(fieldAt([pair[1]], 47.5, 0)).toBeLessThan(SURFACE)
    expect(fieldAt(pair, 47.5, 0)).toBeGreaterThan(SURFACE)
  })

  it("stays two separate circles while they are still well apart", () => {
    const pair: Blob[] = [
      { x: 0, y: 0, radius: 40 },
      { x: 140, y: 0, radius: 40 },
    ]

    expect(fieldAt(pair, 70, 0)).toBeLessThan(SURFACE)
    expect(fieldAt(pair, 40, 0)).toBeCloseTo(SURFACE, 1)
  })

  it("leaves distant blobs entirely alone", () => {
    const apart: Blob[] = [
      { x: 0, y: 0, radius: 40 },
      { x: 400, y: 0, radius: 40 },
    ]

    expect(fieldAt(apart, 200, 0)).toBe(0)
    expect(fieldAt(apart, 40, 0)).toBeCloseTo(SURFACE, 2)
  })

  it("bridges harder as the blobs close in", () => {
    const at = (gap: number) =>
      fieldAt(
        [
          { x: 0, y: 0, radius: 40 },
          { x: gap, y: 0, radius: 40 },
        ],
        gap / 2,
        0,
      )

    expect(at(90)).toBeGreaterThan(at(130))
    expect(at(130)).toBeGreaterThan(at(170))
  })
})

describe("shade", () => {
  it("is mid-grey exactly on the surface", () => {
    expect(shade(SURFACE)).toBeCloseTo(127.5, 1)
  })

  it("saturates either side without leaving the range", () => {
    for (const field of [0, 0.1, SURFACE, 1, 2, 50]) {
      expect(shade(field)).toBeGreaterThanOrEqual(0)
      expect(shade(field)).toBeLessThanOrEqual(255)
    }
    expect(shade(0)).toBe(0)
    expect(shade(2)).toBe(255)
  })

  it("rises with the field", () => {
    expect(shade(0.9)).toBeGreaterThan(shade(0.7))
    expect(shade(0.7)).toBeGreaterThan(shade(0.5))
  })
})
