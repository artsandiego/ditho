import type { DiffusionKernel } from "./types"

const tap = (dx: number, dy: number, weight: number) => ({ dx, dy, weight })

export const KERNELS: Record<string, DiffusionKernel> = {
  "floyd-steinberg": {
    divisor: 16,
    taps: [tap(1, 0, 7), tap(-1, 1, 3), tap(0, 1, 5), tap(1, 1, 1)],
  },
  atkinson: {
    divisor: 8,
    taps: [
      tap(1, 0, 1),
      tap(2, 0, 1),
      tap(-1, 1, 1),
      tap(0, 1, 1),
      tap(1, 1, 1),
      tap(0, 2, 1),
    ],
  },
  "jarvis-judice-ninke": {
    divisor: 48,
    taps: [
      tap(1, 0, 7), tap(2, 0, 5),
      tap(-2, 1, 3), tap(-1, 1, 5), tap(0, 1, 7), tap(1, 1, 5), tap(2, 1, 3),
      tap(-2, 2, 1), tap(-1, 2, 3), tap(0, 2, 5), tap(1, 2, 3), tap(2, 2, 1),
    ],
  },
  stucki: {
    divisor: 42,
    taps: [
      tap(1, 0, 8), tap(2, 0, 4),
      tap(-2, 1, 2), tap(-1, 1, 4), tap(0, 1, 8), tap(1, 1, 4), tap(2, 1, 2),
      tap(-2, 2, 1), tap(-1, 2, 2), tap(0, 2, 4), tap(1, 2, 2), tap(2, 2, 1),
    ],
  },
  burkes: {
    divisor: 32,
    taps: [
      tap(1, 0, 8), tap(2, 0, 4),
      tap(-2, 1, 2), tap(-1, 1, 4), tap(0, 1, 8), tap(1, 1, 4), tap(2, 1, 2),
    ],
  },
  sierra: {
    divisor: 32,
    taps: [
      tap(1, 0, 5), tap(2, 0, 3),
      tap(-2, 1, 2), tap(-1, 1, 4), tap(0, 1, 5), tap(1, 1, 4), tap(2, 1, 2),
      tap(-1, 2, 2), tap(0, 2, 3), tap(1, 2, 2),
    ],
  },
  "sierra-lite": {
    divisor: 4,
    taps: [tap(1, 0, 2), tap(-1, 1, 1), tap(0, 1, 1)],
  },
}
