import { context2d, createCanvas } from "./canvas"

/** Roughly the longest edge we aim for in an exported PNG. */
const EXPORT_TARGET_EDGE = 2048

/**
 * Whole-number upscaling with smoothing off, so exported pixels stay square and
 * the file matches what is on screen instead of a blurred version of it.
 *
 * The two axes scale independently: once cells are non-square the dither grid
 * no longer carries the photograph's proportions, and the export has to stretch
 * it back the same way the on-screen canvas does. Both factors stay integers,
 * which is what keeps the edges hard.
 */
export function toExportCanvas(image: ImageData, aspect: number): HTMLCanvasElement {
  const base = createCanvas(image.width, image.height)
  context2d(base).putImageData(image, 0, 0)

  const ratio = (aspect * image.height) / image.width
  let scaleY = 1
  let scaleX = Math.max(1, Math.round(ratio))

  for (let candidate = 2; candidate <= 64; candidate++) {
    const nextX = Math.max(1, Math.round(candidate * ratio))
    const longest = Math.max(image.width * nextX, image.height * candidate)
    if (longest > EXPORT_TARGET_EDGE) break
    scaleX = nextX
    scaleY = candidate
  }

  if (scaleX === 1 && scaleY === 1) return base

  const out = createCanvas(image.width * scaleX, image.height * scaleY)
  const ctx = context2d(out)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(base, 0, 0, out.width, out.height)
  return out
}

export function exportFilename(sourceName: string, methodId: string): string {
  const stem = sourceName.replace(/\.[^./]+$/, "") || "image"
  return `${stem}-${methodId}.png`
}

export async function downloadPng(
  image: ImageData,
  aspect: number,
  filename: string,
): Promise<void> {
  const canvas = toExportCanvas(image, aspect)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  )
  if (!blob) throw new Error("Could not encode the PNG.")

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"

  // Firefox ignores clicks on detached anchors, and revoking the URL in the
  // same tick can cancel the download before the browser has read the blob.
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
