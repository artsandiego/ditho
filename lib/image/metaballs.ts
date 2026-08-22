export interface Point {
  x: number
  y: number
}

export interface Blob extends Point {
  radius: number
}

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
 * The metaball field: every blob contributes radius² / distance², and they add.
 *
 * Adding is the whole point. Two blobs that merely overlap as discs would still
 * read as two discs, but their fields sum in the gap between them, so the
 * surface bulges out to meet and they fuse into one shape as they approach.
 *
 * The +1 keeps a centre finite rather than infinite; at blob scale it is noise.
 */
export function fieldAt(blobs: Blob[], x: number, y: number): number {
  let sum = 0

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i]
    const dx = x - blob.x
    const dy = y - blob.y
    sum += (blob.radius * blob.radius) / (dx * dx + dy * dy + 1)
  }

  return sum
}

/**
 * Field to luminance, saturating rather than thresholded: near 127 on a lone
 * blob's surface, rising inside and falling outside with no hard cut. Cutting
 * at the surface would give the dither nothing to bite into.
 */
export function shade(field: number): number {
  return (field / (field + 1)) * 255
}
