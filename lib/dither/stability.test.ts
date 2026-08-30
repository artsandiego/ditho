import { describe, expect, it } from "vitest"

import {
  DEFAULT_PALETTE_METHOD_ID,
  DEFAULT_VIDEO_METHOD_ID,
  METHODS,
  getMethod,
  isStableOverTime,
  suitsRichPalette,
  videoMethods,
} from "./index"

describe("isStableOverTime", () => {
  it("rejects every error-diffusion method", () => {
    for (const method of METHODS.filter((m) => m.family === "diffusion")) {
      expect(isStableOverTime(method.id), method.id).toBe(false)
    }
  })

  it("accepts ordered and halftone, whose pattern is fixed by position", () => {
    for (const method of METHODS.filter((m) => m.family !== "diffusion")) {
      expect(isStableOverTime(method.id), method.id).toBe(true)
    }
  })

  it("does not treat an unknown id as safe", () => {
    expect(isStableOverTime("no-such-method")).toBe(false)
  })
})

describe("videoMethods", () => {
  it("offers only what holds still between frames", () => {
    const offered = videoMethods()

    expect(offered.length).toBeGreaterThan(0)
    expect(offered.every((m) => isStableOverTime(m.id))).toBe(true)
    expect(offered.some((m) => m.family === "diffusion")).toBe(false)
  })

  it("is a strict subset of everything on offer for stills", () => {
    expect(videoMethods().length).toBeLessThan(METHODS.length)
    for (const method of videoMethods()) {
      expect(METHODS).toContain(method)
    }
  })

  it("includes both stable families, not just one", () => {
    const families = new Set(videoMethods().map((m) => m.family))

    expect(families).toContain("ordered")
    expect(families).toContain("halftone")
  })
})

describe("suitsRichPalette", () => {
  it("rejects every error-diffusion method", () => {
    for (const method of METHODS.filter((m) => m.family === "diffusion")) {
      expect(suitsRichPalette(method.id), method.id).toBe(false)
    }
  })

  it("accepts ordered and halftone, which decide between bracketing colors", () => {
    for (const method of METHODS.filter((m) => m.family !== "diffusion")) {
      expect(suitsRichPalette(method.id), method.id).toBe(true)
    }
  })

  it("does not treat an unknown id as suitable", () => {
    expect(suitsRichPalette("no-such-method")).toBe(false)
  })
})

describe("DEFAULT_PALETTE_METHOD_ID", () => {
  it("names a real method that itself suits a rich palette", () => {
    expect(getMethod(DEFAULT_PALETTE_METHOD_ID).id).toBe(DEFAULT_PALETTE_METHOD_ID)
    expect(suitsRichPalette(DEFAULT_PALETTE_METHOD_ID)).toBe(true)
  })

  it("is also safe on video, so switching palettes cannot strand a clip", () => {
    expect(isStableOverTime(DEFAULT_PALETTE_METHOD_ID)).toBe(true)
  })
})

describe("DEFAULT_VIDEO_METHOD_ID", () => {
  it("names a real method that is itself stable", () => {
    expect(getMethod(DEFAULT_VIDEO_METHOD_ID).id).toBe(DEFAULT_VIDEO_METHOD_ID)
    expect(isStableOverTime(DEFAULT_VIDEO_METHOD_ID)).toBe(true)
  })

  it("is one of the methods actually offered for video", () => {
    expect(videoMethods().map((m) => m.id)).toContain(DEFAULT_VIDEO_METHOD_ID)
  })
})
