import { describe, expect, it } from "vitest"

import {
  bracketColors,
  getPalette,
  hexToRgb,
  nearestColor,
  PALETTES,
  rgbToHex,
} from "./palette"
import type { RGB } from "./types"

const MONO: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
]

const luma = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b

describe("hexToRgb", () => {
  it("reads six-digit hex, with or without the hash", () => {
    expect(hexToRgb("#ff6a1f")).toEqual([255, 106, 31])
    expect(hexToRgb("ff6a1f")).toEqual([255, 106, 31])
  })

  it("is case-insensitive, since color pickers disagree on which they emit", () => {
    expect(hexToRgb("#FF6A1F")).toEqual(hexToRgb("#ff6a1f"))
  })

  it("expands three-digit shorthand by doubling each digit", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255])
    expect(hexToRgb("#000")).toEqual([0, 0, 0])
    expect(hexToRgb("#f00")).toEqual([255, 0, 0])
    expect(hexToRgb("#abc")).toEqual([170, 187, 204])
  })
})

describe("rgbToHex", () => {
  it("pads channels below 16 to two digits", () => {
    expect(rgbToHex([1, 2, 3])).toBe("#010203")
    expect(rgbToHex([0, 0, 0])).toBe("#000000")
  })

  it("round-trips every color in every built-in palette", () => {
    for (const palette of PALETTES) {
      for (const color of palette.colors) {
        expect(hexToRgb(rgbToHex(color)), `${palette.id} ${color}`).toEqual(color)
      }
    }
  })
})

describe("PALETTES", () => {
  it("holds only whole channels inside [0, 255]", () => {
    for (const palette of PALETTES) {
      for (const color of palette.colors) {
        expect(color.length, palette.id).toBe(3)

        for (const channel of color) {
          expect(Number.isInteger(channel), `${palette.id} ${color}`).toBe(true)
          expect(channel, `${palette.id} ${color}`).toBeGreaterThanOrEqual(0)
          expect(channel, `${palette.id} ${color}`).toBeLessThanOrEqual(255)
        }
      }
    }
  })

  it("gives every palette at least two colors to dither between", () => {
    for (const palette of PALETTES) {
      expect(palette.colors.length, palette.id).toBeGreaterThanOrEqual(2)
    }
  })

  it("keeps ids unique, since lookup returns the first match", () => {
    const ids = PALETTES.map((p) => p.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("getPalette", () => {
  it("finds each palette by id", () => {
    for (const palette of PALETTES) {
      expect(getPalette(palette.id).id).toBe(palette.id)
    }
  })

  it("falls back to the first palette rather than throwing on an unknown id", () => {
    expect(getPalette("no-such-palette")).toBe(PALETTES[0])
    expect(getPalette("")).toBe(PALETTES[0])
  })
})

describe("nearestColor", () => {
  it("returns a palette entry by reference, never a copy", () => {
    const result = nearestColor(MONO, 10, 10, 10)

    expect(result).toBe(MONO[0])
  })

  it("returns a color exactly when the pixel already sits on one", () => {
    for (const palette of PALETTES) {
      for (const color of palette.colors) {
        const [r, g, b] = color

        expect(nearestColor(palette.colors, r, g, b), `${palette.id} ${color}`).toEqual(
          color,
        )
      }
    }
  })

  it("weights by luminance rather than plain RGB distance", () => {
    const green: RGB = [0, 200, 0]
    const blue: RGB = [0, 0, 255]

    expect(nearestColor([green, blue], 0, 0, 0)).toBe(blue)
  })
})

describe("bracketColors", () => {
  it("collapses to the single entry when the palette has one color", () => {
    const only: RGB = [12, 34, 56]
    const bracket = bracketColors([only], 200, 200, 200)

    expect(bracket.dark).toBe(only)
    expect(bracket.light).toBe(only)
    expect(bracket.t).toBe(0)
  })

  it("lands t on exactly 0 or 1 for a pixel sitting on a palette color", () => {
    for (const palette of PALETTES) {
      for (const color of palette.colors) {
        const [r, g, b] = color
        const { t } = bracketColors(palette.colors, r, g, b)

        expect(t === 0 || t === 1, `${palette.id} ${color} → t=${t}`).toBe(true)
      }
    }
  })

  it("never returns a dark end lighter than its light end", () => {
    for (const palette of PALETTES) {
      for (const value of [0, 40, 90, 127, 160, 210, 255]) {
        const { dark, light } = bracketColors(palette.colors, value, value, value)

        expect(luma(dark), `${palette.id} @ ${value}`).toBeLessThanOrEqual(luma(light))
      }
    }
  })

  it("keeps t inside [0, 1] across the whole grey range", () => {
    for (const palette of PALETTES) {
      for (let value = 0; value <= 255; value += 5) {
        const { t } = bracketColors(palette.colors, value, value, value)

        expect(Number.isFinite(t), `${palette.id} @ ${value}`).toBe(true)
        expect(t, `${palette.id} @ ${value}`).toBeGreaterThanOrEqual(0)
        expect(t, `${palette.id} @ ${value}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it("sits near the midpoint for a pixel halfway between two colors", () => {
    expect(bracketColors(MONO, 127, 127, 127).t).toBeCloseTo(0.5, 1)
  })

  it("brackets a mid grey with black and white under a mono palette", () => {
    const { dark, light } = bracketColors(MONO, 100, 100, 100)

    expect(dark).toEqual([0, 0, 0])
    expect(light).toEqual([255, 255, 255])
  })

  it("returns palette entries by reference, so callers can compare identity", () => {
    const { dark, light } = bracketColors(MONO, 90, 90, 90)

    expect(MONO).toContain(dark)
    expect(MONO).toContain(light)
  })
})
