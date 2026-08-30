import { canEncodeVideo } from "mediabunny"

export interface VideoSupport {
  supported: boolean
  reason?: string
}

export function hasWebCodecs(): boolean {
  return (
    typeof window !== "undefined" &&
    "VideoDecoder" in window &&
    "VideoEncoder" in window &&
    "VideoFrame" in window
  )
}

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
