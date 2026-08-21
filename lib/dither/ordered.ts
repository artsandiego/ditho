import type { OrderedMatrix } from "./matrices"
import { bracketColors } from "./palette"
import type { Bitmap, RGB } from "./types"

/**
 * Ordered (matrix threshold) dithering.
 *
 * No error travels between pixels here. Each one reads a threshold from a
 * tiling matrix and picks between the two palette entries it falls between.
 * That independence is what gives ordered dithering its stable, printable
 * texture, and why it never smears detail the way error diffusion can.
 *
 * `strength` pulls the matrix toward or away from a flat 0.5 threshold: at 0
 * the pattern vanishes and this is plain nearest-colour quantisation, at 1 the
 * matrix is used as-is, above 1 the screen is exaggerated.
 */
export function ordered(
  image: Bitmap,
  matrix: OrderedMatrix,
  palette: RGB[],
  strength: number,
): Bitmap {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(width * height * 4)
  const { size, values } = matrix

  for (let y = 0; y < height; y++) {
    const row = (y % size) * size

    for (let x = 0; x < width; x++) {
      const threshold = 0.5 + (values[row + (x % size)] - 0.5) * strength
      const i = (y * width + x) * 4

      const { dark, light, t } = bracketColors(palette, data[i], data[i + 1], data[i + 2])
      const chosen = t > threshold ? light : dark

      out[i] = chosen[0]
      out[i + 1] = chosen[1]
      out[i + 2] = chosen[2]
      out[i + 3] = 255
    }
  }

  return { data: out, width, height }
}
