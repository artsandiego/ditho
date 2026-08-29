"use client"

import { ImagePlus } from "lucide-react"
import { useRef, useState } from "react"

import { DitherHero } from "@/components/dither-hero"
import { Button } from "@/components/ui/button"

interface UploadDropzoneProps {
  onSelect: (file: File) => void
  busy?: boolean
}

export function UploadDropzone({ onSelect, busy }: UploadDropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const take = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onSelect(file)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        take(event.dataTransfer.files)
      }}
      className={`relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-card transition-colors duration-200 ${
        dragging ? "border-signal" : "border-border"
      }`}
    >
      {/* Flush to the top edge and full width, with the wordmark sitting on it. */}
      <div className="relative">
        {/* Dimmed in dark mode so the wordmark reads against the field. Opacity
            rather than a paler ink: the dots blend toward the card behind them,
            which is the same color the canvas already paints as paper, so only
            the dots change. */}
        <DitherHero className="block h-[210px] w-full sm:h-[248px] dark:opacity-60" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-semibold tracking-[0.32em] text-foreground drop-shadow-sm sm:text-4xl">
            DITHO
          </span>
        </div>
      </div>

      <div className="dot-field flex flex-col items-center gap-7 px-8 py-12 sm:px-16">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h2 className="text-lg font-medium tracking-tight">
            {dragging ? "Release to load" : "Drop a photo or video"}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Images, or MP4 video up to 100 MB and 5 minutes. Nothing is uploaded
            anywhere — everything is read, cropped and dithered entirely inside this
            tab, which is also why video has a limit.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="h-9 gap-2 rounded-lg px-5 text-xs"
          >
            <ImagePlus className="size-3.5" strokeWidth={1.75} />
            {busy ? "Reading…" : "Choose file"}
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            or drag it here
          </span>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm"
        hidden
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ""
        }}
      />
    </div>
  )
}
