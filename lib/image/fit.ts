export interface Size {
  width: number
  height: number
}

/**
 * Fit a box of the given aspect ratio inside another, letterboxing rather than
 * cropping or stretching. The result never exceeds the container on either
 * axis and always touches it on one.
 */
export function letterbox(box: Size, aspect: number): Size {
  const height = box.width / aspect

  return height > box.height
    ? { width: box.height * aspect, height: box.height }
    : { width: box.width, height }
}

/**
 * Where one axis of a zoomed image should sit.
 *
 * Smaller than its container, it centres. Larger, it is held so the container
 * is always fully covered — you can never drag the image off into empty space.
 */
export function clampPan(position: number, size: number, container: number): number {
  if (size <= container) return (container - size) / 2

  return Math.min(0, Math.max(container - size, position))
}

/**
 * The new top-left corner after zooming about a fixed point.
 *
 * Keeps whatever sits under the cursor exactly where it is, which is what makes
 * scroll-to-zoom feel anchored instead of drifting toward a corner.
 */
export function zoomAbout(
  origin: number,
  pointer: number,
  from: number,
  to: number,
): number {
  return pointer - (pointer - origin) * (to / from)
}
