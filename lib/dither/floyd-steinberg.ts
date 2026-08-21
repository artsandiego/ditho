import type { DitherAlgorithm } from "./types"

/**
 * Floyd-Steinberg error diffusion.
 *
 * Each pixel snaps to black or white, and the rounding error is pushed into the
 * neighbors that have not been visited yet:
 *
 *        *   7/16
 *   3/16 5/16 1/16
 *
 * The running buffer is Float32Array because that error regularly drives values
 * outside 0-255. Clamping mid-pass is the classic way this comes out looking
 * like flat noise instead of a dither.
 *
 * Returns one byte per pixel, each 0 or 255. The input is left untouched so the
 * same luminance buffer can be re-dithered at a new threshold.
 */
export function ditherFloydSteinberg(
  gray: Float32Array,
  width: number,
  height: number,
  threshold: number,
): Uint8ClampedArray {
  const buffer = Float32Array.from(gray)
  const out = new Uint8ClampedArray(width * height)

  for (let y = 0; y < height; y++) {
    const hasBelow = y + 1 < height

    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const previous = buffer[i]
      const quantized = previous < threshold ? 0 : 255
      out[i] = quantized

      const error = previous - quantized
      const hasRight = x + 1 < width

      if (hasRight) buffer[i + 1] += (error * 7) / 16
      if (hasBelow) {
        if (x > 0) buffer[i + width - 1] += (error * 3) / 16
        buffer[i + width] += (error * 5) / 16
        if (hasRight) buffer[i + width + 1] += error / 16
      }
    }
  }

  return out
}

export const floydSteinberg: DitherAlgorithm = {
  id: "floyd-steinberg",
  name: "Floyd-Steinberg",
  apply: (gray, width, height, options) =>
    ditherFloydSteinberg(gray, width, height, options.threshold),
}
