/** Smoothstep, so the lattice reads as soft blotches rather than diamonds. */
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * Deterministic value noise: random values on a coarse lattice, smoothly
 * interpolated between.
 *
 * Per-pixel randomness would be the obvious thing and the wrong one — dithered,
 * it comes out as even static with no structure to it. Interpolating a lattice
 * gives low-frequency variation instead, so the texture drifts between bare and
 * speckled the way a paper grain does.
 *
 * Seeded rather than `Math.random`, so a given seed always gives the same
 * grain and the texture never crawls between frames.
 */
export function valueNoise(
  width: number,
  height: number,
  cell: number,
  seed: number,
): Float32Array {
  const step = Math.max(1, Math.floor(cell))
  const columns = Math.ceil(width / step) + 2
  const rows = Math.ceil(height / step) + 2

  const lattice = new Float32Array(columns * rows)
  let state = seed >>> 0
  for (let i = 0; i < lattice.length; i++) {
    // xorshift32: cheap, and good enough for a grain.
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    lattice[i] = state / 0xffffffff
  }

  const out = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    const gy = y / step
    const row = Math.floor(gy)
    const fy = ease(gy - row)

    for (let x = 0; x < width; x++) {
      const gx = x / step
      const column = Math.floor(gx)
      const fx = ease(gx - column)

      const topLeft = lattice[row * columns + column]
      const topRight = lattice[row * columns + column + 1]
      const bottomLeft = lattice[(row + 1) * columns + column]
      const bottomRight = lattice[(row + 1) * columns + column + 1]

      const top = topLeft + (topRight - topLeft) * fx
      const bottom = bottomLeft + (bottomRight - bottomLeft) * fx
      out[y * width + x] = top + (bottom - top) * fy
    }
  }

  return out
}
