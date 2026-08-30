"use client"

import { useEffect, useState } from "react"

import { renderDither, type DitherResult, type DitherSettings } from "@/lib/dither/pipeline"

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

    const frame = requestAnimationFrame(run)
    const timer = window.setTimeout(run, 32)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [source, settings])

  return result && result.source === source ? result.value : null
}
