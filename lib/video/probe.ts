import { ALL_FORMATS, BlobSource, Input } from "mediabunny"

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
export const MAX_VIDEO_SECONDS = 5 * 60

const readableSize = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`

const readableLength = (seconds: number) => {
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`
}

export interface VideoInfo {
  input: Input
  width: number
  height: number
  duration: number
  frameRate: number
  frames: number
  name: string
}

export async function probeVideo(file: File): Promise<VideoInfo> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `That video is ${readableSize(file.size)}. The limit is ${readableSize(MAX_VIDEO_BYTES)}, since everything is processed in this tab.`,
    )
  }

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })

  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error(`${file.name || "That file"} has no video track.`)

    if (!(await track.canDecode())) {
      throw new Error(
        `${file.name || "That video"} uses a codec this browser cannot decode.`,
      )
    }

    const [duration, metrics, width, height] = await Promise.all([
      input.computeDuration(),
      track.computeFrameRateMetrics(),
      track.getDisplayWidth(),
      track.getDisplayHeight(),
    ])

    if (duration > MAX_VIDEO_SECONDS) {
      throw new Error(
        `That video runs ${readableLength(duration)}. The limit is ${readableLength(MAX_VIDEO_SECONDS)}, since everything is processed in this tab.`,
      )
    }

    const frameRate = metrics.bestGuessFrameRate || 30

    return {
      input,
      width,
      height,
      duration,
      frameRate,
      frames: Math.max(1, Math.round(duration * frameRate)),
      name: file.name,
    }
  } catch (error) {
    input.dispose()
    throw error
  }
}
