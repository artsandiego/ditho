/**
 * Flatten RGBA pixels to a single luminance channel using Rec. 601 weights,
 * compositing any transparency over white so PNG cutouts dither predictably.
 *
 * Float32Array, not Uint8ClampedArray: error diffusion pushes values well past
 * 0-255 and clamping mid-algorithm destroys the result.
 */
export function toGrayscale(image: ImageData): Float32Array {
  const { data, width, height } = image
  const gray = new Float32Array(width * height)

  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    const alpha = data[i + 3] / 255
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[p] = luminance * alpha + 255 * (1 - alpha)
  }

  return gray
}

/**
 * Adjust contrast in place. `amount` runs -100 (flat) to 100 (hard), 0 is a
 * no-op. Contrast matters more here than in normal photo editing: it decides
 * which regions land on either side of the dither threshold.
 */
export function applyContrast(gray: Float32Array, amount: number): Float32Array {
  if (amount === 0) return gray

  const c = amount * 2.55
  const factor = (259 * (c + 255)) / (255 * (259 - c))

  for (let i = 0; i < gray.length; i++) {
    gray[i] = factor * (gray[i] - 128) + 128
  }

  return gray
}
