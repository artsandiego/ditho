import { diffuse } from "./diffusion"
import { halftone } from "./halftone"
import { KERNELS } from "./kernels"
import { getMatrix } from "./matrices"
import { ordered } from "./ordered"
import type { DitherMethod } from "./types"

const DIFFUSION_NAMES: Record<string, string> = {
  "floyd-steinberg": "Floyd–Steinberg",
  atkinson: "Atkinson",
  "jarvis-judice-ninke": "Jarvis–Judice–Ninke",
  stucki: "Stucki",
  burkes: "Burkes",
  sierra: "Sierra",
  "sierra-lite": "Sierra Lite",
}

const diffusionMethods: DitherMethod[] = Object.entries(KERNELS).map(([id, kernel]) => ({
  id,
  name: DIFFUSION_NAMES[id] ?? id,
  family: "diffusion",
  apply: (image, options) => diffuse(image, kernel, options.palette, options.serpentine),
}))

export const METHODS: DitherMethod[] = [
  ...diffusionMethods,
  {
    id: "ordered",
    name: "Ordered",
    family: "ordered",
    apply: (image, options) =>
      ordered(image, getMatrix(options.matrixId), options.palette, options.patternStrength),
  },
  {
    id: "halftone",
    name: "Halftone",
    family: "halftone",
    apply: (image, options) =>
      halftone(image, {
        palette: options.palette,
        cellSize: options.cellSize,
        angle: options.angle,
        shape: options.shape,
        cellAspect: options.cellAspect,
      }),
  },
]

export const DEFAULT_METHOD_ID = "floyd-steinberg"

/** What video falls back to when the chosen method cannot be used on it. */
export const DEFAULT_VIDEO_METHOD_ID = "ordered"

/**
 * Whether a method's pattern holds still from one frame to the next.
 *
 * Ordered and halftone read their threshold from a fixed function of the pixel's
 * position, so an unchanged pixel dithers the same way every frame. Error
 * diffusion has no such guarantee: its output at any pixel depends on the error
 * accumulated across everything before it, so a trivial change anywhere earlier
 * reshuffles the whole pattern. Played back, that reads as the dots boiling —
 * the picture crawls even where nothing is moving.
 */
export function isStableOverTime(methodId: string): boolean {
  return getMethod(methodId).family !== "diffusion"
}

/** The methods worth offering for video, in the order they should be listed. */
export function videoMethods(): DitherMethod[] {
  return METHODS.filter((method) => isStableOverTime(method.id))
}

export function getMethod(id: string): DitherMethod {
  return METHODS.find((m) => m.id === id) ?? METHODS[0]
}

export { MATRICES, getMatrix } from "./matrices"
export { PALETTES, getPalette, hexToRgb, rgbToHex } from "./palette"
export type {
  Bitmap,
  DitherFamily,
  DitherMethod,
  HalftoneShape,
  MethodOptions,
  Palette,
  RGB,
} from "./types"
