"use client"

import { useEffect, useRef } from "react"

import { context2d } from "@/lib/image/canvas"

/**
 * The canvas backing store stays at the dither resolution and CSS does the
 * upscaling, so `image-rendering: pixelated` gives an exact nearest-neighbour
 * blow-up for free. No resampling, no soft edges.
 */
export function DitherCanvas({ image }: { image: ImageData | null }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !image) return

    canvas.width = image.width
    canvas.height = image.height
    context2d(canvas).putImageData(image, 0, 0)
  }, [image])

  return (
    <canvas
      ref={ref}
      className="pixelated h-full w-full object-contain"
      style={{ opacity: image ? 1 : 0, transition: "opacity 120ms linear" }}
    />
  )
}
