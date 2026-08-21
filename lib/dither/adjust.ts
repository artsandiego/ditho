import type { Bitmap } from "./types"

/**
 * Build a 256-entry tone curve once and read it per channel.
 *
 * Brightness and contrast are the two knobs that decide which regions land on
 * either side of a palette boundary, so they get adjusted before dithering
 * rather than after. Doing it through a lookup table keeps the per-pixel cost
 * to three array reads.
 */
export function toneCurve(
  brightness: number,
  contrast: number,
  invert: boolean,
): Uint8ClampedArray {
  const curve = new Uint8ClampedArray(256)
  const amount = contrast * 2.55
  const factor = (259 * (amount + 255)) / (255 * (259 - amount))
  const shift = brightness * 2.55

  for (let v = 0; v < 256; v++) {
    const shifted = v + shift
    const stretched = factor * (shifted - 128) + 128
    curve[v] = invert ? 255 - stretched : stretched
  }

  return curve
}

export function applyCurve(image: Bitmap, curve: Uint8ClampedArray): Bitmap {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    out[i] = curve[data[i]]
    out[i + 1] = curve[data[i + 1]]
    out[i + 2] = curve[data[i + 2]]
    out[i + 3] = 255
  }

  return { data: out, width, height }
}
