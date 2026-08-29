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
    // Their output at any pixel depends on error accumulated from everything
    // before it, so a trivial change reshuffles the whole pattern — which reads
    // as the dots boiling once the frames are played in sequence.
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
    // Unknown ids fall back to the first method, which is error diffusion.
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
    // Diffusion pays off its rounding error in neighbouring pixels, which needs
    // a palette dense enough to settle the debt nearby. A few colors read off a
    // photograph are not, so the error travels and the picture muddies.
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
    // Unknown ids fall back to the first method, which is error diffusion.
    expect(suitsRichPalette("no-such-method")).toBe(false)
  })
})

describe("DEFAULT_PALETTE_METHOD_ID", () => {
  it("names a real method that itself suits a rich palette", () => {
    expect(getMethod(DEFAULT_PALETTE_METHOD_ID).id).toBe(DEFAULT_PALETTE_METHOD_ID)
    expect(suitsRichPalette(DEFAULT_PALETTE_METHOD_ID)).toBe(true)
  })

  it("is also safe on video, so switching palettes cannot strand a clip", () => {
    // The two rules are separate claims, and the image default has to satisfy
    // both — a video whose colors came off its own still frame still needs a
    // method that holds still between frames.
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
