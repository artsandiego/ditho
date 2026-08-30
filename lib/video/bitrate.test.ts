import { describe, expect, it } from "vitest"

import { videoBitrate } from "./bitrate"

const RATES = [23.976, 24, 25, 29.97, 30, 47.952, 50, 59.94, 60, 119.88]

describe("videoBitrate", () => {
  it("is always a positive integer, which the encoder demands", () => {
    for (const rate of RATES) {
      for (const [w, h] of [
        [320, 180],
        [1818, 1020],
        [1920, 1080],
        [640, 360],
      ] as const) {
        const bitrate = videoBitrate(w, h, rate)

        expect(Number.isInteger(bitrate), `${w}x${h} @ ${rate}`).toBe(true)
        expect(bitrate, `${w}x${h} @ ${rate}`).toBeGreaterThan(0)
      }
    }
  })

  it("stays within its floor and ceiling", () => {
    expect(videoBitrate(16, 16, 1)).toBe(2_000_000)
    expect(videoBitrate(7680, 4320, 120)).toBe(24_000_000)
  })

  it("rises with pixels and with frame rate", () => {
    expect(videoBitrate(1920, 1080, 30)).toBeGreaterThan(videoBitrate(640, 360, 30))
    expect(videoBitrate(1280, 720, 60)).toBeGreaterThan(videoBitrate(1280, 720, 30))
  })

  it("falls back to a sane rate when the frame rate is unusable", () => {
    const assumed = videoBitrate(1280, 720, 30)

    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(videoBitrate(1280, 720, bad), String(bad)).toBe(assumed)
    }
  })

  it("survives degenerate dimensions rather than returning nonsense", () => {
    for (const [w, h] of [
      [0, 0],
      [-10, 20],
      [1, 1],
    ] as const) {
      const bitrate = videoBitrate(w, h, 30)
      expect(Number.isInteger(bitrate)).toBe(true)
      expect(bitrate).toBeGreaterThan(0)
    }
  })
})
