"use client"

import { Check } from "lucide-react"
import Cropper, { type Area, type Point } from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { LoadedImage } from "@/lib/image/load"

export interface CropState {
  crop: Point
  zoom: number
  aspect: number
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
  const activeRatio = presets.findIndex(
    (preset) => Math.abs(preset.value - value.aspect) < 0.001,
  )

  return (
    <div className="relative min-h-0 flex-1">
      <div className="dot-field absolute inset-0 bg-black">
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

      <div className="instrument floating absolute inset-x-4 bottom-4 flex flex-col gap-4 rounded-2xl px-4 py-3.5 sm:px-5 lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-auto lg:-translate-x-1/2 lg:flex-row lg:items-center lg:gap-8">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="label-key mr-1 shrink-0">Ratio</span>
          {presets.map((preset, index) => {
            const active = index === activeRatio
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ ...value, aspect: preset.value })}
                className={`shrink-0 rounded-md border px-2.5 py-1 text-xs transition-colors ${
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
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:w-48 lg:flex-none">
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
              className="h-9 rounded-lg px-4 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="h-9 gap-1.5 rounded-lg px-5 text-xs"
            >
              <Check className="size-3.5" strokeWidth={2} />
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
