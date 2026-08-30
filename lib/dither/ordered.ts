import type { OrderedMatrix } from "./matrices"
import { bracketColors } from "./palette"
import type { Bitmap, RGB } from "./types"

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
