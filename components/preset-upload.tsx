"use client"

import { FileUp } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { DitherSettings } from "@/lib/dither/pipeline"
import { presetFromJson } from "@/lib/dither/preset"

/**
 * Opens a saved preset from the header, without leaving the picture.
 *
 * The upload screen takes a preset too, by drop or by picker, but that is only
 * reachable before a photograph is open. This is the other half: a look applied
 * to what is already on screen.
 */
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
      {/* A real tooltip rather than the `title` attribute: the native one is
          drawn by the operating system and cannot follow the theme. */}
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
            {/* Shortened rather than dropped on a narrow header: an icon alone
                is a guess, and "Preset" beside an upload arrow is not. */}
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
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = ""
        }}
      />
    </>
  )
}
