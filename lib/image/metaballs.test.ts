import { describe, expect, it } from "vitest"

import { fieldAt, repulsion, shade, type Blob } from "./metaballs"

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

  it("reaches about 1 on a lone blob's surface", () => {
    expect(fieldAt(lone, 40, 0)).toBeCloseTo(1, 1)
  })

  it("falls away with distance and stays finite at the centre", () => {
    expect(fieldAt(lone, 0, 0)).toBeGreaterThan(fieldAt(lone, 20, 0))
    expect(fieldAt(lone, 20, 0)).toBeGreaterThan(fieldAt(lone, 80, 0))
    expect(Number.isFinite(fieldAt(lone, 0, 0))).toBe(true)
  })

  it("bridges the gap between two approaching blobs", () => {
    // The midpoint between two blobs, each too far to cover it alone. Neither
    // reaches the surface there, but together they clear it — which is what
    // makes them visibly fuse rather than pass as two discs.
    const gap = 100
    const pair: Blob[] = [
      { x: 0, y: 0, radius: 40 },
      { x: gap, y: 0, radius: 40 },
    ]
    const mid = gap / 2

    expect(fieldAt([pair[0]], mid, 0)).toBeLessThan(1)
    expect(fieldAt([pair[1]], mid, 0)).toBeLessThan(1)
    expect(fieldAt(pair, mid, 0)).toBeGreaterThan(
      fieldAt([pair[0]], mid, 0) + fieldAt([pair[1]], mid, 0) - 1e-9,
    )
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

    expect(at(80)).toBeGreaterThan(at(120))
    expect(at(120)).toBeGreaterThan(at(200))
  })
})

describe("shade", () => {
  it("sits mid-grey on a surface, and spans the range without leaving it", () => {
    expect(shade(1)).toBeCloseTo(127.5, 1)
    expect(shade(0)).toBe(0)

    for (const field of [0, 0.1, 1, 5, 50, 1000]) {
      expect(shade(field)).toBeGreaterThanOrEqual(0)
      expect(shade(field)).toBeLessThan(255)
    }
  })

  it("rises with the field", () => {
    expect(shade(4)).toBeGreaterThan(shade(2))
    expect(shade(2)).toBeGreaterThan(shade(1))
  })
})
