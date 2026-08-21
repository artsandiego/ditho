export type RGB = readonly [number, number, number]

export interface Palette {
  id: string
  name: string
  colors: RGB[]
}

export type DitherFamily = "diffusion" | "ordered" | "halftone"

export type HalftoneShape = "circle" | "square" | "diamond" | "line"

/**
 * One tap of an error-diffusion kernel: push `weight / divisor` of this pixel's
 * rounding error to the neighbour `dx` across and `dy` down.
 */
export interface DiffusionTap {
  dx: number
  dy: number
  weight: number
}

export interface DiffusionKernel {
  taps: DiffusionTap[]
  divisor: number
}

/** Everything a method might need. Each family reads only what applies to it. */
export interface MethodOptions {
  palette: RGB[]
  /** Alternate scan direction per row. Diffusion only. */
  serpentine: boolean
  /** How hard the threshold matrix is applied. Ordered only. */
  patternStrength: number
  /** Which threshold matrix to tile. Ordered only. */
  matrixId: string
  /** Halftone cell size in source pixels. */
  cellSize: number
  /** Halftone screen angle in degrees. */
  angle: number
  shape: HalftoneShape
  /** Horizontal stretch of a halftone cell. 1 is round. */
  cellAspect: number
}

/**
 * A raw RGBA buffer. `ImageData` satisfies this structurally, so the pipeline
 * can hand one straight in, while the kernels stay testable outside a browser.
 */
export interface Bitmap {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface DitherMethod {
  id: string
  name: string
  family: DitherFamily
  /** RGBA in, RGBA out, same dimensions. Pure and DOM-free. */
  apply(image: Bitmap, options: MethodOptions): Bitmap
}
