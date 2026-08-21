/** Tunables shared by every dithering algorithm. */
export interface DitherOptions {
  /** Luminance cutoff between black and white, 0-255. */
  threshold: number
}

/**
 * A dithering kernel. Pure and DOM-free: takes a luminance buffer, returns one
 * byte per pixel (0 or 255). Keeping this shape means new algorithms are a new
 * file plus a registry entry, with no changes to the pipeline or the UI.
 */
export interface DitherAlgorithm {
  id: string
  name: string
  apply(
    gray: Float32Array,
    width: number,
    height: number,
    options: DitherOptions,
  ): Uint8ClampedArray
}
