const ease = (t: number) => t * t * (3 - 2 * t)

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
