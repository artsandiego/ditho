import { describe, expect, it } from "vitest"

import { MAX_IMAGE_COLORS, MIN_IMAGE_COLORS } from "./extract"
import { DEFAULT_SETTINGS, MIN_CUSTOM_COLORS, type DitherSettings } from "./pipeline"
import {
  decodePreset,
  encodePreset,
  fromPreset,
  presetFilename,
  presetFromJson,
  presetFromLocation,
  presetLink,
  presetToJson,
  toPreset,
  PRESET_VERSION,
} from "./preset"

/** A settings object that differs from the defaults in every carried field. */
const TUNED: DitherSettings = {
  ...DEFAULT_SETTINGS,
  methodId: "halftone",
  matrixId: "bayer-8",
  pixelSize: 7,
  cellAspect: 1.15,
  patternStrength: 0.4,
  shape: "diamond",
  angle: 30,
  serpentine: false,
  brightness: -8,
  contrast: 24,
  invert: true,
  colorMode: "palette",
  ink: "#112233",
  paper: "#ffeedd",
  paletteId: "gameboy",
  customColors: ["#000000", "#ffffff", "#ff0000"],
  imageColorCount: 5,
  imageColors: ["#123456", "#abcdef"],
}

describe("toPreset", () => {
  it("carries every setting that is not tied to one photograph", () => {
    const { settings } = toPreset(TUNED)

    for (const key of ["methodId", "shape", "angle", "colorMode", "customColors"] as const) {
      expect(settings[key], key).toEqual(TUNED[key])
    }
  })

  it("never carries the colors read off the image", () => {
    // They belong to the photograph that was open, not to the look. Baking them
    // in would paint the next picture in colors it does not contain.
    expect(toPreset(TUNED).settings).not.toHaveProperty("imageColors")
  })

  it("stamps a version", () => {
    expect(toPreset(TUNED).version).toBe(PRESET_VERSION)
  })
})

describe("fromPreset", () => {
  it("round-trips a tuned set of settings", () => {
    const back = fromPreset(toPreset(TUNED))

    expect(back).toEqual({ ...TUNED, imageColors: [] })
  })

  it("always comes back with empty image colors", () => {
    const back = fromPreset({ version: 1, settings: { imageColors: ["#ffffff"] } as never })

    expect(back.imageColors).toEqual([])
  })

  it("fills anything the preset omits from the defaults", () => {
    // What lets a preset saved today survive a setting added tomorrow.
    const back = fromPreset({ version: 1, settings: { methodId: "ordered" } })

    expect(back.methodId).toBe("ordered")
    expect(back.contrast).toBe(DEFAULT_SETTINGS.contrast)
    expect(back.paper).toBe(DEFAULT_SETTINGS.paper)
  })

  it("returns the defaults for null, undefined and junk", () => {
    expect(fromPreset(null)).toEqual(DEFAULT_SETTINGS)
    expect(fromPreset(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(fromPreset({ version: 1, settings: {} })).toEqual(DEFAULT_SETTINGS)
  })

  it("clamps numbers that would otherwise reach the kernels", () => {
    const wild = fromPreset({
      version: 1,
      settings: {
        pixelSize: 9999,
        cellAspect: -3,
        patternStrength: 40,
        angle: 400,
        brightness: 5000,
        contrast: -5000,
        imageColorCount: 999,
      } as never,
    })

    expect(wild.pixelSize).toBe(16)
    expect(wild.cellAspect).toBe(0.25)
    expect(wild.patternStrength).toBe(2)
    expect(wild.angle).toBe(90)
    expect(wild.brightness).toBe(100)
    expect(wild.contrast).toBe(-100)
    expect(wild.imageColorCount).toBe(MAX_IMAGE_COLORS)
  })

  it("keeps a whole number of pixels and colors", () => {
    const fractional = fromPreset({
      version: 1,
      settings: { pixelSize: 4.7, imageColorCount: 3.2 } as never,
    })

    expect(Number.isInteger(fractional.pixelSize)).toBe(true)
    expect(Number.isInteger(fractional.imageColorCount)).toBe(true)
    expect(fractional.imageColorCount).toBeGreaterThanOrEqual(MIN_IMAGE_COLORS)
  })

  it("rejects a shape or mode it does not recognise", () => {
    const bad = fromPreset({
      version: 1,
      settings: { shape: "banana", colorMode: "sepia" } as never,
    })

    expect(bad.shape).toBe(DEFAULT_SETTINGS.shape)
    expect(bad.colorMode).toBe(DEFAULT_SETTINGS.colorMode)
  })

  it("rejects colors that are not six-digit hex", () => {
    const bad = fromPreset({
      version: 1,
      settings: { ink: "red", paper: "#ff", customColors: ["nope", "#gggggg"] } as never,
    })

    expect(bad.ink).toBe(DEFAULT_SETTINGS.ink)
    expect(bad.paper).toBe(DEFAULT_SETTINGS.paper)
    expect(bad.customColors).toEqual(DEFAULT_SETTINGS.customColors)
  })

  it("falls back rather than hand the kernels one color to dither between", () => {
    const one = fromPreset({ version: 1, settings: { customColors: ["#000000"] } })

    expect(one.customColors.length).toBeGreaterThanOrEqual(MIN_CUSTOM_COLORS)
  })

  it("ignores a wrong-typed value instead of adopting it", () => {
    const bad = fromPreset({
      version: 1,
      settings: { serpentine: "yes", invert: 1, pixelSize: "big", methodId: 42 } as never,
    })

    expect(bad.serpentine).toBe(DEFAULT_SETTINGS.serpentine)
    expect(bad.invert).toBe(DEFAULT_SETTINGS.invert)
    expect(bad.pixelSize).toBe(DEFAULT_SETTINGS.pixelSize)
    expect(bad.methodId).toBe(DEFAULT_SETTINGS.methodId)
  })
})

describe("JSON", () => {
  it("round-trips through a file", () => {
    expect(presetFromJson(presetToJson(TUNED))).toEqual({ ...TUNED, imageColors: [] })
  })

  it("is indented, since a preset file is something a person may open", () => {
    expect(presetToJson(TUNED)).toContain("\n  ")
  })

  it("returns null for anything that is not a preset", () => {
    expect(presetFromJson("not json at all")).toBeNull()
    expect(presetFromJson("")).toBeNull()
    expect(presetFromJson("null")).toBeNull()
  })

  it("survives a JSON file with the wrong shape", () => {
    expect(presetFromJson('{"hello":"world"}')).toEqual(DEFAULT_SETTINGS)
  })
})

describe("links", () => {
  it("round-trips through a URL", () => {
    expect(decodePreset(encodePreset(TUNED))).toEqual({ ...TUNED, imageColors: [] })
  })

  it("encodes to characters that survive being pasted into a chat", () => {
    // base64url only: +, / and = are what break when a link is written into a
    // sentence or wrapped by a mail client.
    expect(encodePreset(TUNED)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("reads a preset out of a query string", () => {
    const link = presetLink("https://example.com", TUNED)
    const search = link.slice(link.indexOf("?"))

    expect(presetFromLocation(search)).toEqual({ ...TUNED, imageColors: [] })
  })

  it("returns null when there is no preset in the address", () => {
    expect(presetFromLocation("")).toBeNull()
    expect(presetFromLocation("?other=1")).toBeNull()
  })

  it("returns null for a corrupted preset rather than throwing", () => {
    // A link that lost characters on the way through a chat app.
    expect(decodePreset("!!!not-base64!!!")).toBeNull()
    expect(presetFromLocation("?p=zzzz")).toBeNull()
  })

  it("stays well inside what a browser will carry", () => {
    const maxed: DitherSettings = {
      ...TUNED,
      customColors: Array.from({ length: 8 }, (_, i) => `#00000${i}`),
    }

    expect(presetLink("https://ditho.example.com", maxed).length).toBeLessThan(2000)
  })
})

describe("presetFilename", () => {
  it("says what the preset is", () => {
    expect(presetFilename(TUNED)).toBe("ditho-halftone-palette.json")
  })

  it("is always a .json file", () => {
    expect(presetFilename(DEFAULT_SETTINGS).endsWith(".json")).toBe(true)
  })
})
