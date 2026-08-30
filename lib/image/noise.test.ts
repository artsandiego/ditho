import { describe, expect, it } from "vitest"

import { valueNoise } from "./noise"

const W = 64
const H = 32

describe("valueNoise", () => {
  it("fills the whole field", () => {
    expect(valueNoise(W, H, 8, 1).length).toBe(W * H)
  })

  it("stays within 0 and 1", () => {
    const noise = valueNoise(W, H, 8, 12345)

    for (const value of noise) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it("is the same every time for a given seed", () => {
    expect(Array.from(valueNoise(W, H, 8, 99))).toEqual(
      Array.from(valueNoise(W, H, 8, 99)),
    )
  })

  it("differs between seeds", () => {
    expect(Array.from(valueNoise(W, H, 8, 1))).not.toEqual(
      Array.from(valueNoise(W, H, 8, 2)),
    )
  })

  it("varies smoothly rather than jumping like static", () => {
    const cell = 8
    const noise = valueNoise(W, H, cell, 7)
    let biggestStep = 0

    for (let y = 0; y < H; y++) {
      for (let x = 1; x < W; x++) {
        biggestStep = Math.max(
          biggestStep,
          Math.abs(noise[y * W + x] - noise[y * W + x - 1]),
        )
      }
    }

    expect(biggestStep).toBeLessThan(2 / cell)
  })

  it("actually varies, rather than settling on one value", () => {
    const noise = valueNoise(W, H, 8, 4)

    expect(Math.max(...noise) - Math.min(...noise)).toBeGreaterThan(0.3)
  })

  it("survives a cell size larger than the field", () => {
    const noise = valueNoise(4, 4, 64, 3)

    expect(noise.length).toBe(16)
    expect(noise.every((v) => v >= 0 && v <= 1)).toBe(true)
  })
})
