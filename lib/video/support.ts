import { canEncodeVideo } from "mediabunny"

export interface VideoSupport {
  supported: boolean
  reason?: string
}

/**
 * Whether this browser can decode and encode video at all.
 *
 * WebCodecs covers most browsers now, but not all — Firefox on Android is the
 * notable gap. Checked up front so an unsupported browser is told plainly
 * rather than failing somewhere inside a render.
 */
export function hasWebCodecs(): boolean {
  return (
    typeof window !== "undefined" &&
    "VideoDecoder" in window &&
    "VideoEncoder" in window &&
    "VideoFrame" in window
  )
}

/**
 * The fuller check. Presence of the API is not the same as being able to encode
 * H.264 — that depends on the platform's codecs — so this asks before promising
 * an MP4.
 */
export async function checkVideoSupport(): Promise<VideoSupport> {
  if (!hasWebCodecs()) {
    return {
      supported: false,
      reason:
        "This browser cannot process video. Chrome, Edge, Safari or desktop Firefox can.",
    }
  }

  try {
    if (!(await canEncodeVideo("avc"))) {
      return {
        supported: false,
        reason: "This browser cannot encode H.264, so it cannot write an MP4.",
      }
    }
  } catch {
    return { supported: false, reason: "Could not check this browser's video support." }
  }

  return { supported: true }
}
