/**
 * Bits per pixel per second.
 *
 * Deliberately high. A dither is hard black-and-white edges everywhere, which
 * is the worst case for a DCT codec — the same property already measured on the
 * JPEG export, where a frame came out ten times larger than its PNG and gained
 * eighteen grey levels it had no business having. At an ordinary bitrate H.264
 * smears the dots into mush, so if the output looks soft, suspect this first.
 */
const BITS_PER_PIXEL = 0.15
const MIN_BITRATE = 2_000_000
const MAX_BITRATE = 24_000_000

/** Fallback for a video whose frame rate could not be determined. */
const ASSUMED_FRAME_RATE = 30

/**
 * Bitrate for an output of this size and rate, as a positive integer.
 *
 * Whole numbers are not cosmetic — the encoder rejects anything else outright.
 * Since the rate is a fraction of a pixel count, and real videos run at rates
 * like 29.97 or 23.976, the product is fractional far more often than not. A
 * clip at a whole 24fps happens to divide evenly, which is exactly how this got
 * shipped broken once.
 */
export function videoBitrate(width: number, height: number, frameRate: number): number {
  const rate =
    Number.isFinite(frameRate) && frameRate > 0 ? frameRate : ASSUMED_FRAME_RATE
  const pixels = Math.max(1, width) * Math.max(1, height)
  const wanted = pixels * rate * BITS_PER_PIXEL

  return Math.round(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, wanted)))
}
