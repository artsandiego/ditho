"use client"

import { useEffect, useState } from "react"

import { renderDither, type DitherResult, type DitherSettings } from "@/lib/dither/pipeline"

/**
 * Re-dither whenever the source or any setting changes.
 *
 * The work is synchronous but not free, so it is deferred to the next animation
 * frame. Effect cleanup cancels a pending frame, which means dragging a slider
 * coalesces to one render per frame instead of one per input event.
 *
 * The last result is kept alongside the canvas it came from. While only the
 * settings change, the previous frame stays on screen so sliders do not flicker
 * — but a new source reads as nothing rather than briefly showing the photo the
 * user just replaced.
 */
export function useDitheredImage(
  source: HTMLCanvasElement | null,
  settings: DitherSettings,
): DitherResult | null {
  const [result, setResult] = useState<{
    source: HTMLCanvasElement
    value: DitherResult
  } | null>(null)

  useEffect(() => {
    if (!source) return

    let spent = false
    const run = () => {
      if (spent) return
      spent = true
      setResult({ source, value: renderDither(source, settings) })
    }

    // Frame callbacks never fire in a hidden tab, so a timer races the frame
    // and whichever arrives first wins. Without it the stage stays blank until
    // the tab is foregrounded. Cancelling both on cleanup is what keeps a
    // slider drag down to one render.
    const frame = requestAnimationFrame(run)
    const timer = window.setTimeout(run, 32)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [source, settings])

  return result && result.source === source ? result.value : null
}
