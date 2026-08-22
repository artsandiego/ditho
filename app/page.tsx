"use client"

import { Crop, Download, ImagePlus } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Credit } from "@/components/credit"
import { DitherCanvas } from "@/components/dither-canvas"
import { ImageCropper, initialCropState, type CropState } from "@/components/image-cropper"
import { MethodControls } from "@/components/method-controls"
import { StyleControls } from "@/components/style-controls"
import { ThemeToggle } from "@/components/theme-toggle"
import { UploadDropzone } from "@/components/upload-dropzone"
import { Button } from "@/components/ui/button"
import { useDitheredImage } from "@/hooks/use-dithered-image"
import { DEFAULT_SETTINGS, type DitherSettings } from "@/lib/dither/pipeline"
import { cropToCanvas, isUsableCrop } from "@/lib/image/crop"
import {
  downloadImage,
  exportFilename,
  FORMATS,
  type ExportFormat,
} from "@/lib/image/export"
import { loadImageFile, type LoadedImage } from "@/lib/image/load"

type Stage = "upload" | "crop" | "edit"

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

  const result = useDitheredImage(cropped, settings)

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
      const loaded = await loadImageFile(file)
      releaseUrl()
      liveUrl.current = loaded.url
      setSource(loaded)
      setCropState(initialCropState(loaded))
      setCropped(null)
      setStage("crop")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file.")
    } finally {
      setBusy(false)
    }
  }, [])

  const confirmCrop = () => {
    if (!source || !cropState?.area) return
    try {
      setCropped(cropToCanvas(source.element, cropState.area))
      setCropSerial((serial) => serial + 1)
      setStage("edit")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply that crop.")
    }
  }

  const reset = () => {
    releaseUrl()
    setSource(null)
    setCropState(null)
    setCropped(null)
    setSettings(DEFAULT_SETTINGS)
    setStage("upload")
  }

  const download = async () => {
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
              <div className="flex items-center gap-1">
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
                disabled={!result}
                className="h-8 gap-1.5 rounded-lg px-4 text-xs"
              >
                <Download className="size-3.5" strokeWidth={1.75} />
                Export
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
                New image
              </Button>
            </div>

            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <MethodControls
                settings={settings}
                onChange={setSettings}
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
              <StyleControls settings={settings} onChange={setSettings} />
            </div>
          </Panel>
        </main>
      )}
    </div>
  )
}
