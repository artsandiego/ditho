"use client"

import { useEffect, useRef } from "react"

import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"

const WIDTH = 260
const HEIGHT = 170

/**
 * The empty state runs the real engine.
 *
 * Two light sources drift across a black field and every frame goes through the
 * same Floyd-Steinberg pass a photo would. It costs about 44k pixels a frame,
 * and it shows the tool working before the user has uploaded anything.
 */
export function DitherHero({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const display = ref.current
    if (!display) return

    display.width = WIDTH
    display.height = HEIGHT
    const out = context2d(display)

    const source = createCanvas(WIDTH, HEIGHT)
    const ctx = context2d(source, { willReadFrequently: true })

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let frame = 0

    const draw = () => {
      const t = frame / 60

      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.globalCompositeOperation = "lighter"

      const lights = [
        { x: 0.5 + 0.3 * Math.cos(t * 0.57), y: 0.5 + 0.32 * Math.sin(t * 0.41), r: 0.62 },
        { x: 0.5 + 0.36 * Math.cos(t * 0.29 + 2.1), y: 0.5 + 0.28 * Math.sin(t * 0.63 + 1.2), r: 0.44 },
      ]

      for (const light of lights) {
        const x = light.x * WIDTH
        const y = light.y * HEIGHT
        const r = light.r * WIDTH
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
        gradient.addColorStop(0, "rgba(255,255,255,0.95)")
        gradient.addColorStop(0.55, "rgba(255,255,255,0.28)")
        gradient.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
      }

      out.putImageData(
        renderDither(source, {
          ...DEFAULT_SETTINGS,
          pixelSize: 1,
          contrast: 0,
          serpentine: false,
        }).image,
        0,
        0,
      )

      frame++
      if (!still) raf = requestAnimationFrame(draw)
    }

    draw()
    // Paint once more when the tab comes back, in case it was hidden on mount.
    document.addEventListener("visibilitychange", draw)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", draw)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pixelated ${className ?? ""}`} />
}
