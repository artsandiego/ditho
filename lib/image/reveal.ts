/**
 * How strongly the cursor colours a point, from its squared distance away.
 *
 * Squared in, so the caller never pays for a square root on pixels that turn
 * out to be beyond reach — which is most of them.
 */
export function spotlight(distanceSquared: number, reach: number): number {
  if (reach <= 0) return 0

  const limit = reach * reach
  if (distanceSquared >= limit) return 0

  return 1 - Math.sqrt(distanceSquared) / reach
}

/**
 * Whether a lit dot takes the accent rather than the muted grey.
 *
 * The threshold is a noise sample rather than a constant, which is what
 * dissolves the boundary: across the transition the accent thins into scattered
 * dots instead of ending on a drawn edge. Passing the noise in keeps this pure,
 * and lets the caller hold one static field so the edge cannot shimmer between
 * frames.
 */
export function tinted(tint: number, noise: number): boolean {
  return tint > noise
}
