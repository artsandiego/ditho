"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { DitherCanvas } from "@/components/dither-canvas"
import { DitherControls } from "@/components/dither-controls"
import { ImageCropper, initialCropState, type CropState } from "@/components/image-cropper"
import { UploadDropzone } from "@/components/upload-dropzone"
import { Button } from "@/components/ui/button"
import { useDitheredImage } from "@/hooks/use-dithered-image"
import { DEFAULT_SETTINGS, type DitherSettings } from "@/lib/dither/pipeline"
import { cropToCanvas, isUsableCrop } from "@/lib/image/crop"
import { downloadPng, exportFilename } from "@/lib/image/export"
import { loadImageFile, type LoadedImage } from "@/lib/image/load"

type Stage = "upload" | "crop" | "edit"

const STEPS: { id: Stage; label: string }[] = [
  { id: "upload", label: "Source" },
  { id: "crop", label: "Frame" },
  { id: "edit", label: "Press" },
]

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload")
  const [source, setSource] = useState<LoadedImage | null>(null)
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [cropped, setCropped] = useState<HTMLCanvasElement | null>(null)
  const [settings, setSettings] = useState<DitherSettings>(DEFAULT_SETTINGS)
  const [busy, setBusy] = useState(false)

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

  const handleSelect = useCallback(
    async (file: File) => {
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
    },
    [],
  )

  const confirmCrop = () => {
    if (!source || !cropState?.area) return
    try {
      setCropped(cropToCanvas(source.element, cropState.area))
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
      await downloadPng(
        result.image,
        result.aspect,
        exportFilename(source.name, settings.methodId),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.")
    }
  }

  const activeStep = STEPS.findIndex((step) => step.id === stage)

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-sm font-bold tracking-[0.3em]">DITHO</span>
          <span className="hidden text-[10px] tracking-[0.18em] text-muted-foreground sm:inline">
            ONE-BIT IMAGE PRESS
          </span>
        </div>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Progress">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              aria-current={index === activeStep ? "step" : undefined}
              className={`flex items-baseline gap-2 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                index === activeStep
                  ? "text-signal"
                  : index < activeStep
                    ? "text-foreground/60"
                    : "text-muted-foreground/40"
              }`}
            >
              <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              {step.label}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {stage === "edit" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStage("crop")}
              className="h-8 px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Re-frame
            </Button>
          )}
          {source && (
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="h-8 px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              New image
            </Button>
          )}
        </div>
      </header>

      {stage === "upload" && (
        <main className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-14">
          <UploadDropzone onSelect={handleSelect} busy={busy} />
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
        <main className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <section className="dot-field relative min-h-[46vh] shrink-0 lg:min-h-0 lg:shrink lg:flex-1">
            {/* Insets rather than padding: the canvas sizes off this box, and a
                padded box would make 100% height overflow it. */}
            <div className="absolute inset-5 lg:inset-10">
              <DitherCanvas result={result} />
            </div>
          </section>

          <aside className="flex shrink-0 flex-col border-t border-border bg-card lg:order-first lg:w-[320px] lg:overflow-y-auto lg:border-t-0 lg:border-r">
            <DitherControls
              settings={settings}
              onChange={setSettings}
              resolution={
                result ? { width: result.image.width, height: result.image.height } : null
              }
            />
            <div className="mt-auto border-t border-border p-5">
              <Button
                type="button"
                onClick={download}
                disabled={!result}
                className="h-10 w-full text-[11px] uppercase tracking-[0.22em]"
              >
                Export PNG
              </Button>
            </div>
          </aside>
        </main>
      )}
    </div>
  )
}
