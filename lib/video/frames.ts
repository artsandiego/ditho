import { VideoSampleSink, type Input } from "mediabunny"

import { context2d, createCanvas } from "@/lib/image/canvas"

/**
 * Pull a single frame out as a canvas.
 *
 * Used for the two places a still is needed from a moving picture: the frame
 * the crop is drawn against, and the frame the settings are tuned on. Samples
 * hold decoder resources, so each one is closed as soon as it is drawn.
 */
export async function frameAt(input: Input, timestamp: number): Promise<HTMLCanvasElement> {
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error("That file has no video track.")

  const sink = new VideoSampleSink(track)
  const sample = await sink.getSample(Math.max(0, timestamp))
  if (!sample) throw new Error("Could not read a frame at that point.")

  try {
    const canvas = createCanvas(sample.displayWidth, sample.displayHeight)
    sample.draw(context2d(canvas), 0, 0)
    return canvas
  } finally {
    sample.close()
  }
}
