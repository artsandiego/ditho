export interface Size {
  width: number
  height: number
}

export function letterbox(box: Size, aspect: number): Size {
  const height = box.width / aspect

  return height > box.height
    ? { width: box.height * aspect, height: box.height }
    : { width: box.width, height }
}

export function clampPan(position: number, size: number, container: number): number {
  if (size <= container) return (container - size) / 2

  return Math.min(0, Math.max(container - size, position))
}

export function zoomAbout(
  origin: number,
  pointer: number,
  from: number,
  to: number,
): number {
  return pointer - (pointer - origin) * (to / from)
}
