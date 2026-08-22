import type { LoadedImage } from "@/lib/image/load"

import { frameAt } from "./frames"
import type { VideoInfo } from "./probe"

/**
 * Take one frame out of a video and present it as a still image.
 *
 * Deliberately shaped as `LoadedImage`, the same thing a photograph upload
 * produces. That lets the cropper, the preview and every control work on video
 * without knowing they are — the only thing that differs is where the pixels
 * came from.
 */
export async function videoStill(
  info: VideoInfo,
  timestamp: number,
): Promise<LoadedImage> {
  const canvas = await frameAt(info.input, timestamp)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  )
  if (!blob) throw new Error("Could not read that frame.")

  const url = URL.createObjectURL(blob)
  const element = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      element.onload = () => resolve()
      element.onerror = () => reject(new Error("Could not read that frame."))
      element.src = url
    })
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }

  return {
    url,
    element,
    width: canvas.width,
    height: canvas.height,
    name: info.name,
  }
}
