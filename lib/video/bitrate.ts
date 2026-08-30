const BITS_PER_PIXEL = 0.15
const MIN_BITRATE = 2_000_000
const MAX_BITRATE = 24_000_000

const ASSUMED_FRAME_RATE = 30

export function videoBitrate(width: number, height: number, frameRate: number): number {
  const rate =
    Number.isFinite(frameRate) && frameRate > 0 ? frameRate : ASSUMED_FRAME_RATE
  const pixels = Math.max(1, width) * Math.max(1, height)
  const wanted = pixels * rate * BITS_PER_PIXEL

  return Math.round(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, wanted)))
}
