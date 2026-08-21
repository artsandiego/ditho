import { nearestColor } from "./palette"
import type { Bitmap, DiffusionKernel, RGB } from "./types"

/**
 * Generic error diffusion.
 *
 * Each pixel snaps to its nearest palette entry and the rounding error is
 * pushed into neighbours the scan has not reached yet, weighted by the kernel.
 * Working in Float32 matters: diffused error routinely drives channels outside
 * 0-255, and clamping mid-pass is what turns a dither into flat noise.
 *
 * Serpentine flips the scan direction every other row, mirroring each tap's
 * horizontal offset with it. That breaks up the diagonal streaking that a
 * strictly left-to-right scan leaves across smooth gradients.
 */
export function diffuse(
  image: Bitmap,
  kernel: DiffusionKernel,
  palette: RGB[],
  serpentine: boolean,
): Bitmap {
  const { width, height, data } = image
  const pixels = width * height

  const buffer = new Float32Array(pixels * 3)
  for (let p = 0; p < pixels; p++) {
    buffer[p * 3] = data[p * 4]
    buffer[p * 3 + 1] = data[p * 4 + 1]
    buffer[p * 3 + 2] = data[p * 4 + 2]
  }

  const out = new Uint8ClampedArray(pixels * 4)

  for (let y = 0; y < height; y++) {
    const reverse = serpentine && y % 2 === 1

    for (let step = 0; step < width; step++) {
      const x = reverse ? width - 1 - step : step
      const p = (y * width + x) * 3

      const r = buffer[p]
      const g = buffer[p + 1]
      const b = buffer[p + 2]
      const chosen = nearestColor(palette, r, g, b)

      const o = (y * width + x) * 4
      out[o] = chosen[0]
      out[o + 1] = chosen[1]
      out[o + 2] = chosen[2]
      out[o + 3] = 255

      const errorR = r - chosen[0]
      const errorG = g - chosen[1]
      const errorB = b - chosen[2]

      for (let t = 0; t < kernel.taps.length; t++) {
        const { dx, dy, weight } = kernel.taps[t]
        const nx = x + (reverse ? -dx : dx)
        const ny = y + dy
        if (nx < 0 || nx >= width || ny >= height) continue

        const np = (ny * width + nx) * 3
        const share = weight / kernel.divisor
        buffer[np] += errorR * share
        buffer[np + 1] += errorG * share
        buffer[np + 2] += errorB * share
      }
    }
  }

  return { data: out, width, height }
}
