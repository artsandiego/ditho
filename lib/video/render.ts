import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  VideoSampleSink,
  type Input,
} from "mediabunny"

import { renderDither, type DitherSettings } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"
import { cropToCanvas, type PixelCrop } from "@/lib/image/crop"
import { exportScales } from "@/lib/image/scale"

import { videoBitrate } from "./bitrate"

/** Long edge of the exported video. Beyond this, encoding turns slow for no visible gain. */
const TARGET_EDGE = 1920

export interface RenderProgress {
  frames: number
  /** Estimated total, so this can overshoot slightly on variable-frame-rate video. */
  total: number
}

export interface RenderOptions {
  input: Input
  crop: PixelCrop
  settings: DitherSettings
  /** Estimated frame count, for progress only. */
  total: number
  /** From the probe, so the output declares the same rate it read. */
  frameRate: number
  signal?: AbortSignal
  onProgress?: (progress: RenderProgress) => void
}

export interface RenderResult {
  blob: Blob
  frames: number
  width: number
  height: number
}

const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2)

/**
 * Dither every frame of a video and mux the result into a new MP4.
 *
 * Each frame goes through exactly the same path a photograph does — crop, then
 * `renderDither` — so every method, palette and tone setting applies unchanged.
 *
 * Output dimensions are fixed from the first frame. The crop and settings do not
 * change mid-render, so the dither grid is the same size throughout, and an
 * encoder needs constant dimensions regardless.
 */
export async function renderVideo({
  input,
  crop,
  settings,
  total,
  frameRate,
  signal,
  onProgress,
}: RenderOptions): Promise<RenderResult> {
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error("That file has no video track.")

  const sink = new VideoSampleSink(track)

  /** Everything that can only be sized once the first frame has been dithered. */
  interface Pipe {
    output: Output<Mp4OutputFormat, BufferTarget>
    source: CanvasSource
    out: CanvasRenderingContext2D
    grid: HTMLCanvasElement
    gridCtx: CanvasRenderingContext2D
    width: number
    height: number
  }

  const open = async (image: ImageData, aspect: number): Promise<Pipe> => {
    const scales = exportScales(image.width, image.height, aspect, TARGET_EDGE)
    // Even dimensions: H.264 chroma is subsampled, and odd sizes are refused
    // outright by some encoders.
    const width = even(image.width * scales.x)
    const height = even(image.height * scales.y)

    const outCanvas = createCanvas(width, height)
    const out = context2d(outCanvas)
    out.imageSmoothingEnabled = false

    const grid = createCanvas(image.width, image.height)

    const source = new CanvasSource(outCanvas, {
      codec: "avc",
      bitrate: videoBitrate(width, height, frameRate),
    })

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    })
    output.addVideoTrack(source, { frameRate })
    await output.start()

    return { output, source, out, grid, gridCtx: context2d(grid), width, height }
  }

  let pipe: Pipe | null = null
  let frame: HTMLCanvasElement | null = null
  let frames = 0
  // Presentation timestamps are not guaranteed to start at zero, or even to be
  // positive — a trimmed clip or an edit list will happily hand back negative
  // ones, and an encoder refuses those outright. Everything is shifted so the
  // first frame kept lands on zero, which preserves the spacing between frames
  // rather than clamping several of them onto the same instant.
  let origin: number | null = null

  try {
    for await (const sample of sink.samples()) {
      if (signal?.aborted) {
        sample.close()
        throw new DOMException("Render cancelled.", "AbortError")
      }

      try {
        origin ??= sample.timestamp
        const timestamp = sample.timestamp - origin
        // Checked before any drawing, so a frame that ends before the clip
        // starts costs nothing beyond having been decoded.
        if (timestamp + sample.duration <= 0) continue

        if (!frame) frame = createCanvas(sample.displayWidth, sample.displayHeight)
        const frameCtx = context2d(frame)
        frameCtx.clearRect(0, 0, frame.width, frame.height)
        sample.draw(frameCtx, 0, 0)

        const { image, aspect } = renderDither(cropToCanvas(frame, crop), settings)
        pipe ??= await open(image, aspect)

        // Grid first, then a whole-number blow-up with smoothing off, so cells
        // stay square and hard-edged rather than being resampled soft.
        pipe.gridCtx.putImageData(image, 0, 0)
        pipe.out.drawImage(pipe.grid, 0, 0, pipe.width, pipe.height)

        await pipe.source.add(Math.max(0, timestamp), sample.duration)
        frames++
        onProgress?.({ frames, total })
      } finally {
        sample.close()
      }
    }

    if (!pipe) throw new Error("That video had no frames to render.")

    await pipe.output.finalize()
    const buffer = pipe.output.target.buffer
    if (!buffer) throw new Error("Could not assemble the MP4.")

    return {
      blob: new Blob([buffer], { type: "video/mp4" }),
      frames,
      width: pipe.width,
      height: pipe.height,
    }
  } catch (error) {
    if (pipe && pipe.output.state !== "finalized") {
      await pipe.output.cancel().catch(() => {})
    }
    throw error
  }
}
