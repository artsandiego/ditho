"use client"

import { FileUp } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { DitherSettings } from "@/lib/dither/pipeline"
import { presetFromJson } from "@/lib/dither/preset"

export function PresetUpload({
  onLoad,
}: {
  onLoad: (settings: DitherSettings) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  const take = async (file: File | undefined) => {
    if (!file) return

    const loaded = presetFromJson(await file.text())
    if (!loaded) {
      toast.error("That file is not a Ditho preset.")
      return
    }

    onLoad(loaded)
    toast.success("Preset applied.")
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            onClick={() => input.current?.click()}
            aria-label="Upload preset"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs sm:px-3"
          >
            <FileUp className="size-3.5" strokeWidth={1.75} />
            <span className="sm:hidden">Preset</span>
            <span className="hidden sm:inline">Upload Preset</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open a saved .json preset</TooltipContent>
      </Tooltip>

      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          take(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </>
  )
}
