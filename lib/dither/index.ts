import { floydSteinberg } from "./floyd-steinberg"
import type { DitherAlgorithm } from "./types"

export const ALGORITHMS: Record<string, DitherAlgorithm> = {
  [floydSteinberg.id]: floydSteinberg,
}

export const DEFAULT_ALGORITHM_ID = floydSteinberg.id

export function getAlgorithm(id: string): DitherAlgorithm {
  return ALGORITHMS[id] ?? floydSteinberg
}

export { floydSteinberg, ditherFloydSteinberg } from "./floyd-steinberg"
export { toGrayscale, applyContrast } from "./grayscale"
export type { DitherAlgorithm, DitherOptions } from "./types"
