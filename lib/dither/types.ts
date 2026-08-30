export type RGB = readonly [number, number, number]

export interface Palette {
  id: string
  name: string
  colors: RGB[]
}

export type DitherFamily = "diffusion" | "ordered" | "halftone"

export type HalftoneShape = "circle" | "square" | "diamond" | "line"

export interface DiffusionTap {
  dx: number
  dy: number
  weight: number
}

export interface DiffusionKernel {
  taps: DiffusionTap[]
  divisor: number
}

export interface MethodOptions {
  palette: RGB[]
  serpentine: boolean
  patternStrength: number
  matrixId: string
  cellSize: number
  angle: number
  shape: HalftoneShape
  cellAspect: number
}

export interface Bitmap {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface DitherMethod {
  id: string
  name: string
  family: DitherFamily
  apply(image: Bitmap, options: MethodOptions): Bitmap
}
