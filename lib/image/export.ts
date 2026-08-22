import { context2d, createCanvas } from "./canvas"

/** Roughly the longest edge we aim for in an exported file. */
const EXPORT_TARGET_EDGE = 2048

/**
 * High, deliberately. JPEG was built for photographs, and a dither is the
 * opposite of one: hard black-and-white edges everywhere are exactly what its
 * frequency transform handles worst, so anything lower rings visibly around
 * every cell.
 */
const JPEG_QUALITY = 0.95

export type ExportFormat = "png" | "jpeg"

export const FORMATS: { id: ExportFormat; label: string; extension: string }[] = [
  { id: "png", label: "PNG", extension: "png" },
  { id: "jpeg", label: "JPG", extension: "jpg" },
]

const formatOf = (format: ExportFormat) => FORMATS.find((f) => f.id === format) ?? FORMATS[0]

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

export function exportFilename(
  sourceName: string,
  methodId: string,
  format: ExportFormat,
): string {
  const stem = sourceName.replace(/\.[^./]+$/, "") || "image"
  return `${stem}-${methodId}.${formatOf(format).extension}`
}

export async function downloadImage(
  image: ImageData,
  aspect: number,
  filename: string,
  format: ExportFormat,
): Promise<void> {
  const canvas = toExportCanvas(image, aspect)

  // JPEG has no alpha and composites transparency onto black, which would turn
  // paper into ink. The dither is opaque, but flattening onto white keeps that
  // true regardless of what the source carried.
  if (format === "jpeg") {
    const ctx = context2d(canvas)
    ctx.globalCompositeOperation = "destination-over"
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = "source-over"
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, `image/${format}`, format === "jpeg" ? JPEG_QUALITY : undefined),
  )
  if (!blob) throw new Error(`Could not encode the ${formatOf(format).label}.`)

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
