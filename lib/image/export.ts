import { context2d, createCanvas } from "./canvas"
import { exportScales } from "./scale"

const EXPORT_TARGET_EDGE = 2048

const JPEG_QUALITY = 0.95

export type ExportFormat = "png" | "jpeg"

export const FORMATS: { id: ExportFormat; label: string; extension: string }[] = [
  { id: "png", label: "PNG", extension: "png" },
  { id: "jpeg", label: "JPG", extension: "jpg" },
]

const formatOf = (format: ExportFormat) => FORMATS.find((f) => f.id === format) ?? FORMATS[0]

export function toExportCanvas(image: ImageData, aspect: number): HTMLCanvasElement {
  const base = createCanvas(image.width, image.height)
  context2d(base).putImageData(image, 0, 0)

  const { x, y } = exportScales(image.width, image.height, aspect, EXPORT_TARGET_EDGE)
  if (x === 1 && y === 1) return base

  const out = createCanvas(image.width * x, image.height * y)
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

  saveBlob(blob, filename)
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"

  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
