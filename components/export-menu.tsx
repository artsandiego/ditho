"use client"

import { Check, ChevronDown, Download, FileJson, Share2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Credit } from "@/components/credit"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DitherSettings } from "@/lib/dither/pipeline"
import { presetFilename, presetLink, presetToJson } from "@/lib/dither/preset"
import { saveBlob, FORMATS, type ExportFormat } from "@/lib/image/export"

interface ExportMenuProps {
  settings: DitherSettings
  forVideo: boolean
  disabled: boolean
  onExport: (format: ExportFormat) => void
  onExportVideo: () => void
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] leading-snug text-muted-foreground">{children}</span>
  )
}

export function ExportMenu({
  settings,
  forVideo,
  disabled,
  onExport,
  onExportVideo,
}: ExportMenuProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!copied) return
    timer.current = setTimeout(() => setCopied(false), 2500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [copied])

  const downloadPreset = () => {
    const blob = new Blob([presetToJson(settings)], { type: "application/json" })
    saveBlob(blob, presetFilename(settings))
  }

  const sharePreset = async () => {
    const link = presetLink(window.location.origin, settings)
    const touch =
      typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches

    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Ditho preset", url: link })
        return
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" className="h-8 gap-1.5 rounded-lg px-4 text-xs">
          <Download className="size-3.5" strokeWidth={1.75} />
          Export
          <ChevronDown className="size-3 opacity-70" strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export as:</DropdownMenuLabel>

        <div className="flex gap-1">
          {forVideo ? (
            <DropdownMenuItem
              disabled={disabled}
              onSelect={onExportVideo}
              className="flex-1 items-center justify-center bg-accent/60 font-medium data-highlighted:bg-accent"
            >
              MP4
            </DropdownMenuItem>
          ) : (
            FORMATS.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                disabled={disabled}
                onSelect={() => onExport(entry.id)}
                className="flex-1 items-center justify-center bg-accent/60 font-medium data-highlighted:bg-accent"
              >
                {entry.label}
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Get the preset</DropdownMenuLabel>

        <DropdownMenuItem onSelect={downloadPreset}>
          <span className="flex items-center gap-1.5 font-medium">
            <FileJson className="size-3.5 text-signal" strokeWidth={1.75} />
            Download
          </span>
          <Hint>
            A small .json file of every setting except the picture. Open it here
            later to put the same look on something else.
          </Hint>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            sharePreset()
          }}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Share2 className="size-3.5 text-signal" strokeWidth={1.75} />
            Share
          </span>
          <Hint>
            A link carrying the settings and nothing else. Whoever opens it gets
            these settings ready for their own photo.
          </Hint>

          {copied && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-3" strokeWidth={2.5} />
              Link copied
            </span>
          )}
        </DropdownMenuItem>

        <div className="xl:hidden">
          <DropdownMenuSeparator />
          <div className="p-1">
            <Credit />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
