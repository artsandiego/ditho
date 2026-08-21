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
