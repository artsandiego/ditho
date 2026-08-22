export interface Point {
  x: number
  y: number
}

export interface Blob extends Point {
  /** Visible radius: where a lone blob's surface actually lands. */
  radius: number
}

/** The field value that marks a blob's surface. */
export const SURFACE = 0.5

/**
 * How far past its visible radius a blob still exerts pull.
 *
 * Chosen so a lone blob's field is exactly SURFACE at `radius`, which is what
 * lets the visible circle be specified directly instead of back-solved.
 */
const INFLUENCE = 2.2

/** Width of the field band the dither feathers across. */
const SOFTNESS = 0.8

/**
 * How far a blob is shoved by the cursor.
 *
 * Directly away from the pointer, fading linearly to nothing at `reach` so
 * blobs drift back rather than snapping at the boundary. A pointer sitting
 * exactly on a centre has no direction to push along, so it pushes nowhere
 * instead of dividing by zero.
 */
export function repulsion(
  at: Point,
  pointer: Point | null,
  reach: number,
  push: number,
): Point {
  if (!pointer) return { x: 0, y: 0 }

  const awayX = at.x - pointer.x
  const awayY = at.y - pointer.y
  const distance = Math.hypot(awayX, awayY)

  if (distance >= reach || distance < 1e-6) return { x: 0, y: 0 }

  const strength = (1 - distance / reach) * push
  return { x: (awayX / distance) * strength, y: (awayY / distance) * strength }
}

/**
 * The metaball field: a smooth bump per blob, and the bumps add.
 *
 * The bump has compact support — exactly zero at and beyond the influence
 * radius, rather than the 1/d² falloff a naive metaball uses. That difference
 * is the whole reason a lone blob reads as a circle here: an inverse-square
 * tail never actually reaches zero, so every blob keeps tugging on every other
 * one from across the canvas and the outlines sag into lopsided amoebas.
 *
 * Adding still gives the merge. Where two blobs come close their bumps overlap
 * and the sum crosses the surface in the gap between them, so they bulge
 * together and fuse instead of sliding past as two discs.
 */
export function fieldAt(blobs: Blob[], x: number, y: number): number {
  let sum = 0

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i]
    const reach = blob.radius * INFLUENCE
    const dx = x - blob.x
    const dy = y - blob.y
    const spread = (dx * dx + dy * dy) / (reach * reach)
    if (spread >= 1) continue

    const bump = 1 - spread
    sum += bump * bump * bump
  }

  return sum
}

/**
 * Field to luminance, centred on the surface: mid-grey exactly on a blob's
 * edge, saturating to solid a little inside and to nothing a little outside.
 * The band is what the dither feathers across — cut it to zero and the edge
 * would be a hard jagged line instead.
 */
export function shade(field: number): number {
  const t = (field - SURFACE) / SOFTNESS + 0.5
  return Math.max(0, Math.min(1, t)) * 255
}
