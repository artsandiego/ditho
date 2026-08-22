import { describe, expect, it } from "vitest"

import { advanceLens, lensSettled, type Lens, type LensTarget } from "./lens"

const EASE = 0.16
const FADE = 0.1

const lens = (over: Partial<Lens> = {}): Lens => ({ x: 0, y: 0, strength: 0, ...over })
const target = (over: Partial<LensTarget> = {}): LensTarget => ({
  x: 0,
  y: 0,
  active: true,
  ...over,
})

describe("advanceLens", () => {
  it("appears where the cursor is rather than sliding in from a stale position", () => {
    const it_ = lens({ x: 400, y: 400, strength: 0 })

    advanceLens(it_, target({ x: 20, y: 30 }), EASE, FADE)

    expect(it_.x).toBe(20)
    expect(it_.y).toBe(30)
  })

  it("trails behind a moving cursor instead of jumping to it", () => {
    const it_ = lens({ x: 0, y: 0, strength: 1 })

    advanceLens(it_, target({ x: 100, y: 0 }), EASE, FADE)

    expect(it_.x).toBeGreaterThan(0)
    expect(it_.x).toBeLessThan(100)
    expect(it_.x).toBeCloseTo(16, 5)
  })

  it("slows as it closes, rather than arriving at a constant speed", () => {
    const it_ = lens({ x: 0, y: 0, strength: 1 })
    const to = target({ x: 100, y: 0 })

    const first = (advanceLens(it_, to, EASE, FADE), it_.x)
    const second = (advanceLens(it_, to, EASE, FADE), it_.x)
    const third = (advanceLens(it_, to, EASE, FADE), it_.x)

    expect(second - first).toBeLessThan(first)
    expect(third - second).toBeLessThan(second - first)
  })

  it("gets there in the end", () => {
    const it_ = lens({ x: 0, y: 0, strength: 1 })
    const to = target({ x: 100, y: -60 })

    for (let i = 0; i < 200; i++) advanceLens(it_, to, EASE, FADE)

    expect(it_.x).toBeCloseTo(100, 3)
    expect(it_.y).toBeCloseTo(-60, 3)
    expect(it_.strength).toBeCloseTo(1, 3)
  })

  it("fades in gradually rather than snapping on", () => {
    const it_ = lens()
    const to = target({ x: 10, y: 10 })

    advanceLens(it_, to, EASE, FADE)
    expect(it_.strength).toBeCloseTo(FADE, 5)
    expect(it_.strength).toBeLessThan(0.5)

    for (let i = 0; i < 100; i++) advanceLens(it_, to, EASE, FADE)
    expect(it_.strength).toBeCloseTo(1, 3)
  })

  it("fades out once the cursor leaves", () => {
    const it_ = lens({ x: 10, y: 10, strength: 1 })
    const gone = target({ x: 10, y: 10, active: false })

    advanceLens(it_, gone, EASE, FADE)
    expect(it_.strength).toBeLessThan(1)
    expect(it_.strength).toBeGreaterThan(0)

    for (let i = 0; i < 200; i++) advanceLens(it_, gone, EASE, FADE)
    expect(it_.strength).toBeCloseTo(0, 3)
  })

  it("arrives immediately when the easing is turned off for reduced motion", () => {
    const it_ = lens({ x: 0, y: 0, strength: 1 })

    advanceLens(it_, target({ x: 90, y: 45 }), 1, 1)

    expect(it_.x).toBe(90)
    expect(it_.y).toBe(45)
    expect(it_.strength).toBe(1)
  })
})

describe("lensSettled", () => {
  it("is unsettled while there is still ground to cover", () => {
    expect(lensSettled(lens({ x: 0, strength: 1 }), target({ x: 100 }))).toBe(false)
    expect(lensSettled(lens({ strength: 0.5 }), target())).toBe(false)
  })

  it("settles once the remainder is invisible", () => {
    expect(lensSettled(lens({ x: 99.9, y: 0, strength: 1 }), target({ x: 100 }))).toBe(true)
  })

  it("settles after enough frames, which is what stops the loop", () => {
    const it_ = lens({ x: 0, y: 0, strength: 1 })
    const to = target({ x: 120, y: 40 })

    let frames = 0
    while (!lensSettled(it_, to) && frames < 500) {
      advanceLens(it_, to, EASE, FADE)
      frames++
    }

    expect(frames).toBeLessThan(500)
    expect(lensSettled(it_, to)).toBe(true)
  })
})
