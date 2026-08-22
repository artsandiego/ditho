import { ALL_FORMATS, BlobSource, Input } from "mediabunny"

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
