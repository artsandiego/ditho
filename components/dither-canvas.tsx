"use client"

import { useEffect, useRef } from "react"

import type { DitherResult } from "@/lib/dither/pipeline"
import { context2d } from "@/lib/image/canvas"

/**
 * The canvas backing store stays at the dither resolution and CSS does the
 * scaling, so `image-rendering: pixelated` gives an exact nearest-neighbour
 * blow-up for free.
 *
 * The displayed aspect ratio comes from the photograph, not from the grid.
 * Non-square cells make those two disagree on purpose, and a canvas stretches
 * its bitmap to whatever box it is given — which is exactly the stretch wanted.
 */
export function DitherCanvas({ result }: { result: DitherResult | null }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !result) return

    canvas.width = result.image.width
    canvas.height = result.image.height
    context2d(canvas).putImageData(result.image, 0, 0)
  }, [result])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <canvas
        ref={ref}
        className="pixelated block w-full max-h-full max-w-full"
        style={{
          aspectRatio: String(result?.aspect ?? 1),
          opacity: result ? 1 : 0,
          transition: "opacity 120ms linear",
        }}
      />
    </div>
  )
}
