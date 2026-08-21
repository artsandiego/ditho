"use client"

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
      className={`dot-field relative flex w-full max-w-2xl flex-col items-center gap-10 border px-8 py-16 transition-colors duration-200 sm:px-16 ${
        dragging ? "border-signal bg-signal/5" : "border-border bg-card"
      }`}
    >
      <div className="pointer-events-none absolute -top-px left-6 flex items-center gap-2 bg-background px-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        <span className={dragging ? "text-signal" : undefined}>
          {dragging ? "release" : "source"}
        </span>
      </div>

      <DitherHero className="h-[170px] w-[260px] opacity-80" />

      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-lg font-medium tracking-tight">
          Drop a photograph
        </h2>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          JPEG, PNG, WebP or GIF. Nothing is uploaded anywhere — the image is read,
          cropped and dithered entirely inside this tab.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="h-9 px-6 text-[11px] uppercase tracking-[0.2em]"
        >
          {busy ? "Reading…" : "Choose file"}
        </Button>
        <span className="label-key hidden sm:inline">or drag it here</span>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ""
        }}
      />
    </div>
  )
}
