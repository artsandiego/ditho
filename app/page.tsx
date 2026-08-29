"use client"

import { Crop, Download, Film, ImagePlus, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Credit } from "@/components/credit"
import { DitherCanvas } from "@/components/dither-canvas"
import { ImageCropper, initialCropState, type CropState } from "@/components/image-cropper"
import { MethodControls } from "@/components/method-controls"
import { StyleControls } from "@/components/style-controls"
import { ThemeToggle } from "@/components/theme-toggle"
import { UploadDropzone } from "@/components/upload-dropzone"
import { VideoProgress } from "@/components/video-progress"
import { Button } from "@/components/ui/button"
import { useDitheredImage } from "@/hooks/use-dithered-image"
import {
  DEFAULT_PALETTE_METHOD_ID,
  DEFAULT_VIDEO_METHOD_ID,
  extractPalette,
  isStableOverTime,
  rgbToHex,
  suitsRichPalette,
} from "@/lib/dither"
import { DEFAULT_SETTINGS, type DitherSettings } from "@/lib/dither/pipeline"
import { downscaleCanvas, readImageData } from "@/lib/image/canvas"
import { cropToCanvas, isUsableCrop } from "@/lib/image/crop"
import {
  downloadImage,
  exportFilename,
  saveBlob,
  FORMATS,
  type ExportFormat,
} from "@/lib/image/export"
import { loadImageFile, type LoadedImage } from "@/lib/image/load"
import { probeVideo, type VideoInfo } from "@/lib/video/probe"
import { renderVideo } from "@/lib/video/render"
import { videoStill } from "@/lib/video/still"
import { checkVideoSupport } from "@/lib/video/support"

type Stage = "upload" | "crop" | "edit"

/**
 * The photograph's own colors, read off a small copy of the crop.
 *
 * A few hundred pixels describe the color distribution as well as several
 * million, and reading a full 24-megapixel frame would allocate tens of
 * megabytes to answer the same question.
 */
function readImageColors(canvas: HTMLCanvasElement, count: number): string[] {
  const longest = Math.max(canvas.width, canvas.height)
  const scale = Math.min(1, 256 / longest)
  const small = downscaleCanvas(canvas, canvas.width * scale, canvas.height * scale)

  return extractPalette(readImageData(small), count).map(rgbToHex)
}

/** Flush and stacked on a phone; a floating card either side once there is room. */
function Panel({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-t border-border bg-card lg:absolute lg:inset-y-6 lg:w-[320px] lg:overflow-hidden lg:rounded-2xl lg:border lg:bg-card/95 lg:shadow-2xl lg:shadow-black/60 lg:backdrop-blur-md ${
        side === "left" ? "lg:left-6" : "lg:right-6"
      }`}
    >
      {children}
    </aside>
  )
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload")
  const [source, setSource] = useState<LoadedImage | null>(null)
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [cropped, setCropped] = useState<HTMLCanvasElement | null>(null)
  // Bumped per crop so the preview remounts with a fresh zoom and pan.
  const [cropSerial, setCropSerial] = useState(0)
  const [settings, setSettings] = useState<DitherSettings>(DEFAULT_SETTINGS)
  const [busy, setBusy] = useState(false)
  // Kept out of `settings` on purpose: that object drives the pipeline, and
  // changing the export format should not cost a re-dither.
  const [format, setFormat] = useState<ExportFormat>("png")
  // Present only for video. The still in `source` is one frame out of it, which
  // is what every control and the cropper actually operate on.
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [render, setRender] = useState<{ frames: number; total: number } | null>(null)
  // Explains that the preview is a single frame. Dismissible, since it has done
  // its job once read, and re-shown for each new video rather than remembered.
  const [notice, setNotice] = useState(true)
  const abort = useRef<AbortController | null>(null)

  const result = useDitheredImage(cropped, settings)

  // The image palette is derived from the crop, so it is re-read whenever the
  // crop or the count changes. Doing it on the event rather than in an effect
  // keeps it out of the render loop: an effect that writes state it also
  // depends on cascades an extra render every time.
  //
  // It is held in settings rather than recomputed per frame because a video
  // render must dither every frame against one fixed palette — re-reading each
  // frame would make the colors crawl.
  const changeSettings = (next: DitherSettings) => {
    const patched = { ...next }

    // Arriving on an image palette also moves off error diffusion, which handles
    // a sparse set of arbitrary colors badly. Only on the way in, so a method
    // picked deliberately afterwards is left alone.
    if (
      next.colorMode === "image" &&
      settings.colorMode !== "image" &&
      !suitsRichPalette(next.methodId)
    ) {
      patched.methodId = DEFAULT_PALETTE_METHOD_ID
    }

    if (
      cropped !== null &&
      (next.imageColorCount !== settings.imageColorCount ||
        (next.colorMode === "image" && next.imageColors.length === 0))
    ) {
      patched.imageColors = readImageColors(cropped, next.imageColorCount)
    }

    setSettings(patched)
  }

  // Object URLs outlive the component that made them, so the live one is tracked
  // here and released whenever it is replaced. The ref is only ever written from
  // handlers and effects, never during render.
  const liveUrl = useRef<string | null>(null)
  const releaseUrl = () => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current)
    liveUrl.current = null
  }
  useEffect(() => releaseUrl, [])

  const handleSelect = useCallback(async (file: File) => {
    setBusy(true)
    try {
      const isVideo = file.type.startsWith("video/")

      if (isVideo) {
        const support = await checkVideoSupport()
        if (!support.supported) throw new Error(support.reason)
      }

      // Video is reduced to a single still here, and everything downstream —
      // cropper, controls, preview — treats it exactly like a photograph. Only
      // the export knows the difference.
      const info = isVideo ? await probeVideo(file) : null
      // A frame from a third of the way in: openings are often black or fading.
      const start = info ? info.duration / 3 : 0
      const loaded = info ? await videoStill(info, start) : await loadImageFile(file)

      // Error diffusion recomputes its pattern every frame, so it boils on
      // playback. Video is offered only the methods that hold still, and a
      // choice carried over from a photo is moved to one of them.
      if (info) {
        setNotice(true)
        setSettings((current) =>
          isStableOverTime(current.methodId)
            ? current
            : { ...current, methodId: DEFAULT_VIDEO_METHOD_ID },
        )
      }

      releaseUrl()
      liveUrl.current = loaded.url
      video?.input.dispose()
      setVideo(info)
      setSource(loaded)
      setCropState(initialCropState(loaded))
      setCropped(null)
      setStage("crop")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file.")
    } finally {
      setBusy(false)
    }
  }, [video])

  const confirmCrop = () => {
    if (!source || !cropState?.area) return
    try {
      const canvas = cropToCanvas(source.element, cropState.area)

      setCropped(canvas)
      setCropSerial((serial) => serial + 1)
      // Re-framing changes which colors are in shot, so the image palette is
      // read again off the new crop rather than kept from the old one.
      setSettings((current) => ({
        ...current,
        imageColors: readImageColors(canvas, current.imageColorCount),
      }))
      setStage("edit")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply that crop.")
    }
  }

  const reset = () => {
    abort.current?.abort()
    releaseUrl()
    video?.input.dispose()
    setVideo(null)
    setRender(null)
    setSource(null)
    setCropState(null)
    setCropped(null)
    setSettings(DEFAULT_SETTINGS)
    setStage("upload")
  }

  const download = async () => {
    if (!result || !source) return

    if (video) {
      if (!cropState?.area) return
      const controller = new AbortController()
      abort.current = controller
      setRender({ frames: 0, total: video.frames })

      try {
        const out = await renderVideo({
          input: video.input,
          crop: cropState.area,
          settings,
          total: video.frames,
          frameRate: video.frameRate,
          signal: controller.signal,
          onProgress: setRender,
        })
        const stem = video.name.replace(/\.[^./]+$/, "") || "video"
        saveBlob(out.blob, `${stem}-${settings.methodId}.mp4`)
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          toast.error(error instanceof Error ? error.message : "Render failed.")
        }
      } finally {
        abort.current = null
        setRender(null)
      }
      return
    }

    try {
      await downloadImage(
        result.image,
        result.aspect,
        exportFilename(source.name, settings.methodId, format),
        format,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.")
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
        <button
          type="button"
          onClick={reset}
          aria-label="DITHO — back to the start"
          className="text-sm font-semibold tracking-[0.3em] transition-colors hover:text-signal"
        >
          DITHO
        </button>

        <div className="flex items-center gap-2">
          {stage === "edit" && (
            <>
              <div className={`flex items-center gap-1 ${video ? "hidden" : ""}`}>
                {FORMATS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setFormat(entry.id)}
                    aria-pressed={format === entry.id}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      format === entry.id
                        ? "border-signal text-signal"
                        : "border-border text-muted-foreground hover:border-input hover:text-foreground"
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                onClick={download}
                disabled={!result || render !== null}
                className="h-8 gap-1.5 rounded-lg px-4 text-xs"
              >
                <Download className="size-3.5" strokeWidth={1.75} />
                {video ? "Export MP4" : "Export"}
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {stage === "upload" && (
        <main className="flex flex-1 flex-col overflow-y-auto px-5 py-10">
          <div className="flex flex-1 items-center justify-center">
            <UploadDropzone onSelect={handleSelect} busy={busy} />
          </div>
          <div className="flex shrink-0 justify-center pt-10">
            <Credit />
          </div>
        </main>
      )}

      {stage === "crop" && source && cropState && (
        <main className="flex min-h-0 flex-1 flex-col">
          <ImageCropper
            image={source}
            value={cropState}
            onChange={setCropState}
            onConfirm={confirmCrop}
            canConfirm={isUsableCrop(cropState.area)}
            onCancel={() => (cropped ? setStage("edit") : reset())}
            confirmLabel={cropped ? "Apply" : "Dither"}
          />
        </main>
      )}

      {stage === "edit" && (
        <main className="relative flex flex-1 flex-col overflow-y-auto lg:block lg:overflow-hidden">
          {/* The stage runs full bleed and the panels float over it, so its side
              insets have to clear them rather than sit between them. */}
          <section className="dot-field relative min-h-[46vh] shrink-0 lg:absolute lg:inset-0 lg:min-h-0">
            {/* Insets rather than padding: the canvas sizes off this box, and a
                padded box would make 100% height overflow it. */}
            <div className="absolute inset-5 lg:inset-y-8 lg:left-[372px] lg:right-[372px]">
              <DitherCanvas key={cropSerial} result={result} />
            </div>

            {video && notice && (
              <div className="floating absolute inset-x-5 top-5 flex items-start gap-3 rounded-2xl py-3 pl-4 pr-2 lg:inset-x-auto lg:left-1/2 lg:top-8 lg:w-[460px] lg:-translate-x-1/2">
                <Film className="mt-0.5 size-4 shrink-0 text-signal" strokeWidth={1.75} />
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  <span className="text-foreground">This is a still preview.</span> It shows
                  one frame so you can see how the settings land. Exporting applies them to
                  every frame and gives you the whole {video.duration.toFixed(1)}s video.
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(false)}
                  aria-label="Dismiss"
                  className="-mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" strokeWidth={1.75} />
                </button>
              </div>
            )}

            {render && (
              <VideoProgress
                frames={render.frames}
                total={render.total}
                onCancel={() => abort.current?.abort()}
              />
            )}
          </section>

          <Panel side="left">
            <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage("crop")}
                className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
              >
                <Crop className="size-3.5" strokeWidth={1.75} />
                Re-frame
              </Button>
              <Button
                type="button"
                onClick={reset}
                className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
              >
                <ImagePlus className="size-3.5" strokeWidth={1.75} />
                New project
              </Button>
            </div>

            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <MethodControls
                settings={settings}
                onChange={setSettings}
                forVideo={video !== null}
                resolution={
                  result ? { width: result.image.width, height: result.image.height } : null
                }
              />
            </div>

            <div className="shrink-0 border-t border-border p-3">
              <Credit />
            </div>
          </Panel>

          <Panel side="right">
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <StyleControls settings={settings} onChange={changeSettings} />
            </div>
          </Panel>
        </main>
      )}
    </div>
  )
}
