"use client"

import { ImagePlus } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"

import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
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
      className={`relative w-full max-w-3xl overflow-hidden rounded-2xl border bg-card transition-colors duration-200 ${
        dragging ? "border-signal" : "border-border"
      }`}
    >
      {/* Flush to the top edge and full width. The app's own output as its
          hero — an ordered dither of a sky, which says what this does more
          directly than a wordmark over it would. */}
      <div className="relative h-[210px] w-full overflow-hidden sm:h-[248px]">
        {/* Both are rendered and CSS picks one off the `dark` class, the same
            way the theme toggle's own icons work. next-themes sets that class
            before first paint, so neither can flash the wrong sky. */}
        <Image
          src="/assets/cloud-day.jpg"
          alt="Clouds at daytime, rendered as an ordered dither"
          fill
          sizes="(max-width: 672px) 100vw, 672px"
          priority
          className="scale-[1.02] object-cover dark:hidden"
        />
        <Image
          src="/assets/cloud-night.jpg"
          alt="Clouds at night, rendered as an ordered dither"
          fill
          sizes="(max-width: 672px) 100vw, 672px"
          className="hidden scale-[1.02] object-cover dark:block"
        />

        {/* Sat on the photograph, so it carries its own ground rather than
            relying on the border and muted ink it uses over a panel. */}
        <ThemeToggle className="absolute right-3 top-3 border-transparent bg-background/70 text-foreground backdrop-blur-sm hover:border-transparent hover:bg-background/90" />
      </div>

      <div className="dot-field flex flex-col items-center gap-7 px-8 py-12 sm:px-16">
        <div className="flex flex-col items-center gap-2.5 text-center">
          {/* The brand sits here rather than in a bar above the card: on the
              first screen the card is the whole page, so there is nothing for a
              header to hold. */}
          <div className="flex items-center gap-3">
            <Logo className="size-9" />
            <span className="text-2xl font-bold tracking-tight">Ditho</span>
          </div>

          <h2 className="text-lg font-medium tracking-tight">
            Image &amp; video dithering tool
          </h2>

          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Ditho works beautifully on both desktop and mobile, multi-algorithm
            format, video support, and a mobile home screen install{" "}
            <span className="text-foreground">(Try it on mobile!)</span>
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
          <span
            className={`hidden text-xs sm:inline ${dragging ? "text-signal" : "text-muted-foreground"}`}
          >
            {dragging ? "Release to load" : "or drag it here"}
          </span>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm,application/json,.json"
        hidden
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ""
        }}
      />
    </div>
  )
}
