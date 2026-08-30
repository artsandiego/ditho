export interface OrderedMatrix {
  id: string
  name: string
  size: number
  values: number[]
}

function bayer(order: number): number[][] {
  let matrix = [[0]]

  for (let level = 0; level < order; level++) {
    const size = matrix.length
    const next: number[][] = Array.from({ length: size * 2 }, () =>
      new Array<number>(size * 2).fill(0),
    )

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const base = matrix[y][x] * 4
        next[y][x] = base
        next[y][x + size] = base + 2
        next[y + size][x] = base + 3
        next[y + size][x + size] = base + 1
      }
    }

    matrix = next
  }

  return matrix
}

const normalise = (id: string, name: string, grid: number[][]): OrderedMatrix => {
  const size = grid.length
  const total = size * size
  return {
    id,
    name,
    size,
    values: grid.flat().map((v) => v / total),
  }
}

const CLUSTERED = [
  [12, 5, 6, 13],
  [4, 0, 1, 7],
  [11, 3, 2, 8],
  [15, 10, 9, 14],
]

const lineGrid = (vertical: boolean) => {
  const order = [0, 8, 4, 12, 2, 10, 6, 14]
  return Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => order[vertical ? x : y] * 4),
  )
}

const DIAGONAL = Array.from({ length: 8 }, (_, y) =>
  Array.from({ length: 8 }, (_, x) => [0, 8, 16, 24, 32, 40, 48, 56][(x + y) % 8]),
)

const NOISE = (() => {
  let seed = 0x2f6e2b1
  const size = 16
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return (seed >> 8) % (size * size)
    }),
  )
})()

export const MATRICES: OrderedMatrix[] = [
  normalise("bayer-2", "Bayer 2×2", bayer(1)),
  normalise("bayer-4", "Bayer 4×4", bayer(2)),
  normalise("bayer-8", "Bayer 8×8", bayer(3)),
  normalise("clustered", "Clustered dot", CLUSTERED),
  normalise("lines-h", "Horizontal lines", lineGrid(false)),
  normalise("lines-v", "Vertical lines", lineGrid(true)),
  normalise("diagonal", "Diagonal", DIAGONAL),
  normalise("noise", "White noise", NOISE),
]

export function getMatrix(id: string): OrderedMatrix {
  return MATRICES.find((m) => m.id === id) ?? MATRICES[1]
}
