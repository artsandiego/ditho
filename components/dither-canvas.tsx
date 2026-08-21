"use client"

import { useEffect, useRef } from "react"

import type { DitherResult } from "@/lib/dither/pipeline"
import { context2d } from "@/lib/image/canvas"
import { letterbox } from "@/lib/image/fit"

/**
 * The canvas backing store stays at the dither resolution and CSS does the
 * scaling, so `image-rendering: pixelated` gives a nearest-neighbour blow-up
 * for free. A canvas stretches its bitmap to whatever box it is given, which is
 * also what makes non-square cells work: the grid stops matching the
 * photograph's proportions on purpose, and the box puts them back.
 *
 * The fit is measured rather than left to CSS. `aspect-ratio` alongside a
 * definite width cannot shrink that width when `max-height` clamps the height,
 * so the box quietly stretches instead of letterboxing, and `object-fit` is no
 * help either — it fits to the bitmap's own ratio rather than the photograph's.
 *
 * Measuring happens up front and again on resize. `shrink-0` matters as much as
 * the measurement: without it the flex parent squashes the canvas the moment
 * the container gets narrower than the width just written, which is the same
 * stretch by another route.
 */
export function DitherCanvas({ result }: { result: DitherResult | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return

    if (!result) {
      canvas.style.opacity = "0"
      return
    }

    canvas.width = result.image.width
    canvas.height = result.image.height
    context2d(canvas).putImageData(result.image, 0, 0)

    const fitToBox = () => {
      const rect = box.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const fit = letterbox(rect, result.aspect)
      canvas.style.width = `${fit.width}px`
      canvas.style.height = `${fit.height}px`
      canvas.style.opacity = "1"
    }

    fitToBox()

    // Two listeners because neither alone is enough: a ResizeObserver catches
    // the panel changing width without the window moving, but stops delivering
    // while the tab is hidden, and comes back only once it is shown again.
    const observer = new ResizeObserver(fitToBox)
    observer.observe(box)
    window.addEventListener("resize", fitToBox)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", fitToBox)
    }
  }, [result])

  return (
    <div ref={boxRef} className="flex h-full w-full items-center justify-center">
      {/* No style prop: React re-applies inline styles on every render, which
          would clobber the size and opacity the effect writes. */}
      <canvas
        ref={canvasRef}
        className="pixelated block shrink-0 opacity-0 transition-opacity duration-150"
      />
    </div>
  )
}
