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

/** What an image palette moves to when the chosen method suits it badly. */
export const DEFAULT_PALETTE_METHOD_ID = "ordered"

/**
 * Whether a method copes with an arbitrary, unevenly spaced set of colors.
 *
 * Ordered and halftone place a pixel between the two palette entries that
 * bracket it and pick one, so any set works: the decision is local and bounded.
 * Error diffusion instead carries the leftover difference into its neighbours,
 * which only pays off if the palette is dense enough to settle that debt
 * nearby. A handful of colors pulled off a photograph is not — so the error
 * travels instead of dispersing, and the picture muddies and streaks.
 *
 * Deliberately separate from `isStableOverTime` despite selecting the same
 * methods today. That one is a claim about frames and this one about color;
 * they happen to agree, and nothing says they always will.
 */
export function suitsRichPalette(methodId: string): boolean {
  return getMethod(methodId).family !== "diffusion"
}

export function getMethod(id: string): DitherMethod {
  return METHODS.find((m) => m.id === id) ?? METHODS[0]
}

export { MATRICES, getMatrix } from "./matrices"
export { PALETTES, getPalette, hexToRgb, rgbToHex } from "./palette"
export {
  DEFAULT_IMAGE_COLORS,
  MAX_IMAGE_COLORS,
  MIN_IMAGE_COLORS,
  extractPalette,
} from "./extract"
export type {
  Bitmap,
  DitherFamily,
  DitherMethod,
  HalftoneShape,
  MethodOptions,
  Palette,
  RGB,
} from "./types"
