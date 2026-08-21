"use client"

import Cropper, { type Area, type Point } from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { LoadedImage } from "@/lib/image/load"

export interface CropState {
  crop: Point
  zoom: number
  aspect: number
  /** Null until react-easy-crop reports the first crop. */
  area: Area | null
}

export function initialCropState(image: LoadedImage): CropState {
  return {
    crop: { x: 0, y: 0 },
    zoom: 1,
    aspect: image.width / image.height,
    area: null,
  }
}

const PRESETS = [
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
]

interface ImageCropperProps {
  image: LoadedImage
  value: CropState
  onChange: (next: CropState) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLabel: string
  canConfirm: boolean
}

export function ImageCropper({
  image,
  value,
  onChange,
  onConfirm,
  onCancel,
  confirmLabel,
  canConfirm,
}: ImageCropperProps) {
  const original = image.width / image.height
  const presets = [{ label: "Original", value: original }, ...PRESETS]
  // Original frequently *is* one of the presets, so match once rather than
  // lighting up two chips for the same ratio.
  const activeRatio = presets.findIndex(
    (preset) => Math.abs(preset.value - value.aspect) < 0.001,
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="dot-field relative min-h-0 flex-1 border-b border-border bg-black">
        <Cropper
          image={image.url}
          crop={value.crop}
          zoom={value.zoom}
          aspect={value.aspect}
          minZoom={1}
          maxZoom={8}
          showGrid
          objectFit="contain"
          onCropChange={(crop) => onChange({ ...value, crop })}
          onZoomChange={(zoom) => onChange({ ...value, zoom })}
          onCropComplete={(_, area) => onChange({ ...value, area })}
        />
      </div>

      <div className="instrument flex shrink-0 flex-col gap-4 bg-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="label-key mr-1 shrink-0">Ratio</span>
          {presets.map((preset, index) => {
            const active = index === activeRatio
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ ...value, aspect: preset.value })}
                className={`shrink-0 border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-signal text-signal"
                    : "border-border text-muted-foreground hover:border-input hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4 lg:max-w-xs">
            <span className="label-key hidden shrink-0 sm:inline">Zoom</span>
            <Slider
              value={[value.zoom]}
              min={1}
              max={8}
              step={0.01}
              onValueChange={([zoom]) => onChange({ ...value, zoom })}
              aria-label="Zoom"
            />
            <span className="value-readout w-10 shrink-0 text-right">
              {value.zoom.toFixed(2)}×
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="h-9 px-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="h-9 px-6 text-[11px] uppercase tracking-[0.2em]"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
