"use client"

import { Crop, Film, ImagePlus, RotateCcw, X } from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Credit } from "@/components/credit"
import type { EditorTab } from "@/components/controls/sections"
import { DitherCanvas } from "@/components/dither-canvas"
import { EditorTabs } from "@/components/editor-tabs"
import { ExportMenu } from "@/components/export-menu"
import { initialCropState, type CropState } from "@/lib/image/crop-state"
import { InstallPrompt } from "@/components/install-prompt"
import { Logo } from "@/components/logo"
import { PresetUpload } from "@/components/preset-upload"
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
import { presetFromJson, presetFromLocation } from "@/lib/dither/preset"
import { downscaleCanvas, readImageData } from "@/lib/image/canvas"
import { cropToCanvas, isUsableCrop } from "@/lib/image/crop"
import {
  downloadImage,
  exportFilename,
  saveBlob,
  type ExportFormat,
} from "@/lib/image/export"
import { loadImageFile, type LoadedImage } from "@/lib/image/load"
import type { VideoInfo } from "@/lib/video/probe"

const ImageCropper = dynamic(
  () => import("@/components/image-cropper").then((m) => m.ImageCropper),
  {
    ssr: false,
    loading: () => <div className="dot-field min-h-0 flex-1" />,
  },
)

type Stage = "upload" | "crop" | "edit"

function readImageColors(canvas: HTMLCanvasElement, count: number): string[] {
  const longest = Math.max(canvas.width, canvas.height)
  const scale = Math.min(1, 256 / longest)
  const small = downscaleCanvas(canvas, canvas.width * scale, canvas.height * scale)

  return extractPalette(readImageData(small), count).map(rgbToHex)
}

function Panel({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <aside
      className={`absolute inset-y-6 hidden w-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/60 backdrop-blur-md xl:flex ${
        side === "left" ? "left-6" : "right-6"
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
  const [cropSerial, setCropSerial] = useState(0)
  const [settings, setSettings] = useState<DitherSettings>(() =>
    typeof window === "undefined"
      ? DEFAULT_SETTINGS
      : (presetFromLocation(window.location.search) ?? DEFAULT_SETTINGS),
  )
  const [busy, setBusy] = useState(false)
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [render, setRender] = useState<{ frames: number; total: number } | null>(null)
  const [notice, setNotice] = useState(true)
  const [tab, setTab] = useState<EditorTab | null>("method")
  const abort = useRef<AbortController | null>(null)

  const result = useDitheredImage(cropped, settings)

  const changeSettings = (next: DitherSettings) => {
    const patched = { ...next }

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

  const applyPreset = (next: DitherSettings) => {
    setSettings(
      cropped !== null && next.colorMode === "image"
        ? { ...next, imageColors: readImageColors(cropped, next.imageColorCount) }
        : next,
    )
  }

  const liveUrl = useRef<string | null>(null)
  const releaseUrl = () => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current)
    liveUrl.current = null
  }
  useEffect(() => releaseUrl, [])

  const handleSelect = useCallback(async (file: File) => {
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const loaded = presetFromJson(await file.text())
      if (!loaded) {
        toast.error("That file is not a Ditho preset.")
        return
      }
      setSettings(loaded)
      toast.success("Preset loaded. Choose a photo or video to put it on.")
      return
    }

    setBusy(true)
    try {
      const isVideo = file.type.startsWith("video/")

      let info: VideoInfo | null = null
      let loaded: LoadedImage

      if (isVideo) {
        const [{ checkVideoSupport }, { probeVideo }, { videoStill }] = await Promise.all([
          import("@/lib/video/support"),
          import("@/lib/video/probe"),
          import("@/lib/video/still"),
        ])

        const support = await checkVideoSupport()
        if (!support.supported) throw new Error(support.reason)

        info = await probeVideo(file)
        loaded = await videoStill(info, info.duration / 3)
      } else {
        loaded = await loadImageFile(file)
      }

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
    setTab("method")
    setStage("upload")
  }

  const resetEdits = () => {
    setSettings(
      video && !isStableOverTime(DEFAULT_SETTINGS.methodId)
        ? { ...DEFAULT_SETTINGS, methodId: DEFAULT_VIDEO_METHOD_ID }
        : DEFAULT_SETTINGS,
    )
  }

  const exportVideo = async () => {
    if (!video || !cropState?.area) return

    const controller = new AbortController()
    abort.current = controller
    setRender({ frames: 0, total: video.frames })

    try {
      const { renderVideo } = await import("@/lib/video/render")

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
  }

  const exportStill = async (format: ExportFormat) => {
    if (!result || !source) return

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
      {stage !== "upload" && (
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
        <button
          type="button"
          onClick={reset}
          aria-label="Ditho — back to the start"
          className="flex items-center gap-2 transition-colors hover:text-signal"
        >
          <Logo className="size-4" />
          <span className="text-base font-bold tracking-tight">Ditho</span>
        </button>

        <div className="flex items-center gap-2">
          {stage === "edit" && <PresetUpload onLoad={applyPreset} />}

          {stage === "edit" && (
            <ExportMenu
              settings={settings}
              forVideo={video !== null}
              disabled={!result || render !== null}
              onExport={exportStill}
              onExportVideo={exportVideo}
            />
          )}
          <ThemeToggle />
        </div>
      </header>
      )}

      {stage === "upload" && (
        <main className="flex flex-1 flex-col overflow-y-auto px-5 py-10">
          <div className="mx-auto w-full max-w-md shrink-0">
            <InstallPrompt />
          </div>

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
        <main className="relative flex min-h-0 flex-1 flex-col xl:block xl:overflow-hidden">
          <section className="dot-field relative min-h-0 flex-1 xl:absolute xl:inset-0">
            <div className="absolute inset-5 xl:inset-y-8 xl:left-[372px] xl:right-[372px]">
              <DitherCanvas key={cropSerial} result={result} />
            </div>

            {video && notice && (
              <div className="floating absolute inset-x-5 top-5 flex items-start gap-3 rounded-2xl py-3 pl-4 pr-2 xl:inset-x-auto xl:left-1/2 xl:top-8 xl:w-[460px] xl:-translate-x-1/2">
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

          <EditorTabs
            settings={settings}
            onChange={setSettings}
            onStyleChange={changeSettings}
            forVideo={video !== null}
            resolution={
              result ? { width: result.image.width, height: result.image.height } : null
            }
            active={tab}
            onActivate={setTab}
            onReframe={() => setStage("crop")}
            onReset={resetEdits}
            onNewProject={reset}
          />

          <Panel side="left">
            <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
              <Button
                type="button"
                onClick={reset}
                className="h-9 w-full gap-1.5 rounded-lg text-xs"
              >
                <ImagePlus className="size-3.5" strokeWidth={1.75} />
                New project
              </Button>

              <div className="flex items-center gap-2">
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
                  variant="outline"
                  onClick={resetEdits}
                  className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
                >
                  <RotateCcw className="size-3.5" strokeWidth={1.75} />
                  Reset
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              <StyleControls settings={settings} onChange={changeSettings} />
            </div>
          </Panel>
        </main>
      )}
    </div>
  )
}
