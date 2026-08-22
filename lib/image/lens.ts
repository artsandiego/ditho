export interface Lens {
  x: number
  y: number
  /** 0 when absent, 1 when fully present. */
  strength: number
}

export interface LensTarget {
  x: number
  y: number
  active: boolean
}

/**
 * Move the lens one frame toward its target, easing by a fraction of whatever
 * distance is left. Mutates in place — this runs per frame, and allocating a
 * fresh object each time would be waste.
 *
 * Easing a fraction rather than a fixed step is what gives the lag its weight:
 * it moves fastest when furthest behind and settles gently, instead of arriving
 * at a constant speed and stopping dead.
 *
 * Appearing is the exception. A lens fading in jumps straight to its target
 * first, because easing position from wherever it was last left would send the
 * bloom sweeping across the panel before it caught up.
 */
export function advanceLens(
  lens: Lens,
  target: LensTarget,
  easePosition: number,
  easeStrength: number,
): Lens {
  const wanted = target.active ? 1 : 0

  if (lens.strength < 0.002 && target.active) {
    lens.x = target.x
    lens.y = target.y
  } else {
    lens.x += (target.x - lens.x) * easePosition
    lens.y += (target.y - lens.y) * easePosition
  }

  lens.strength += (wanted - lens.strength) * easeStrength
  return lens
}

/**
 * Whether the lens has arrived closely enough to stop spending frames on it.
 * Sub-pixel position and a strength within a rounding error of its destination
 * are both invisible, so there is nothing left to animate.
 */
export function lensSettled(lens: Lens, target: LensTarget): boolean {
  return (
    Math.abs(lens.x - target.x) < 0.4 &&
    Math.abs(lens.y - target.y) < 0.4 &&
    Math.abs(lens.strength - (target.active ? 1 : 0)) < 0.004
  )
}
