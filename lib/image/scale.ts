export interface Scales {
  x: number
  y: number
}

export function exportScales(
  width: number,
  height: number,
  aspect: number,
  targetEdge: number,
): Scales {
  const ratio = (aspect * height) / width

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
