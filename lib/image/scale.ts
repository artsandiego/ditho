export interface Scales {
  x: number
  y: number
}

/**
 * Whole-number scale factors for blowing a dither grid up to output size.
 *
 * Whole numbers because the point of a dither is hard-edged square cells; any
 * fractional factor resamples them into soft, uneven ones. The two axes are
 * chosen independently: once cells are non-square the grid no longer carries the
 * source's proportions, and the export has to stretch it back.
 *
 * The pair is the largest that keeps the long edge within `targetEdge`, so the
 * aspect comes out as close as whole numbers allow rather than exactly right.
 */
export function exportScales(
  width: number,
  height: number,
  aspect: number,
  targetEdge: number,
): Scales {
  const ratio = (aspect * height) / width

  // Start at the smallest pair that respects the aspect, so a very stretched
  // grid still gets corrected even when one step already fills the target.
  let y = 1
  let x = Math.max(1, Math.round(ratio))

  for (let candidate = 2; candidate <= 64; candidate++) {
    const nextX = Math.max(1, Math.round(candidate * ratio))
    if (Math.max(width * nextX, height * candidate) > targetEdge) break
    x = nextX
    y = candidate
  }

  return { x, y }
}
