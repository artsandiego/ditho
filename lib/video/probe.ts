import { ALL_FORMATS, BlobSource, Input } from "mediabunny"

/**
 * What a browser can reasonably be asked to hold and chew through.
 *
 * Everything is done in memory — the decoded frames, and the whole output file
 * before it is saved — so these are about not running the tab out of memory
 * rather than about policy. Both are checked up front so a video that cannot
 * work is refused immediately, not twenty minutes into a render.
 */
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
  /** Stays open for the render. Call `dispose()` on it when done with the file. */
  input: Input
  width: number
  height: number
  /** Seconds. */
  duration: number
  frameRate: number
  /** Estimated — containers rarely state a frame count outright. */
  frames: number
  name: string
}

/**
 * Open a video and read what the UI needs to describe it: how big, how long,
 * and roughly how many frames a render will have to get through.
 *
 * The frame count is an estimate. Counting for real means walking every packet,
 * which is far too slow to do just to populate a label — and for a
 * variable-frame-rate video there is no single right answer anyway.
 */
export async function probeVideo(file: File): Promise<VideoInfo> {
  // Checked before opening anything: the size is known for free, and there is no
  // sense decoding a file that is going to be turned away regardless.
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
