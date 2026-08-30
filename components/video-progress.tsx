"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface VideoProgressProps {
  frames: number
  total: number
  onCancel: () => void
}

export function VideoProgress({ frames, total, onCancel }: VideoProgressProps) {
  const share = Math.min(1, total > 0 ? frames / total : 0)

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="floating flex w-72 flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Rendering video</span>
          <span className="text-xs text-muted-foreground">
            Frame {frames.toLocaleString()} of about {total.toLocaleString()}
          </span>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-input">
          <div
            className="h-full rounded-full bg-signal transition-[width] duration-150"
            style={{ width: `${share * 100}%` }}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-8 gap-1.5 rounded-lg text-xs"
        >
          <X className="size-3.5" strokeWidth={1.75} />
          Cancel
        </Button>
      </div>
    </div>
  )
}
