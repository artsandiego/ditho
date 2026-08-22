"use client"

import { useEffect, useRef } from "react"

import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"

// Wide and shallow, to be stretched across the top of the card.
const WIDTH = 420
const HEIGHT = 132

/**
 * Palette straight from the stylesheet, re-read only when the theme class
 * actually changes.
 *
 * Reading these in an effect keyed on the theme looked simpler but was a race:
 * the effect could run before next-themes had swapped the class on <html>, so
 * the canvas kept painting in the colours of the theme just left. Keying off
 * the live class instead cannot get out of step, whatever order things run in.
 */
function themeReader() {
  let key = ""
  let palette = { ink: "#ff3d0f", paper: "#0e0e0d", dark: true }

  return () => {
    const root = document.documentElement
    if (root.className === key) return palette

    key = root.className
    const styles = getComputedStyle(root)
    palette = {
      ink: styles.getPropertyValue("--signal").trim() || "#ff3d0f",
      paper: styles.getPropertyValue("--card").trim() || "#0e0e0d",
      dark: root.classList.contains("dark"),
    }
    return palette
  }
}

/**
 * The empty state runs the real engine.
 *
 * Two light sources drift across a field and every frame goes through the same
 * error diffusion a photograph would, in the accent colour against the card.
 * It costs about 55k pixels a frame, and it shows the tool working before the
 * user has uploaded anything.
 *
 * On a light background the source is inverted first: the palette is picked by
 * nearest colour, and without it the mid-toned accent would claim the whole
 * background rather than the drifting highlights.
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

    const readTheme = themeReader()

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let frame = 0

    const draw = () => {
      const t = frame / 60
      const { ink, paper, dark } = readTheme()

      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.globalCompositeOperation = "lighter"

      const lights = [
        { x: 0.5 + 0.26 * Math.cos(t * 0.57), y: 0.5 + 0.22 * Math.sin(t * 0.41), r: 0.46 },
        { x: 0.5 + 0.3 * Math.cos(t * 0.29 + 2.1), y: 0.5 + 0.2 * Math.sin(t * 0.63 + 1.2), r: 0.38 },
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
          colorMode: "duotone",
          ink,
          paper,
          invert: !dark,
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

    // Repaint immediately on a theme switch rather than waiting for the next
    // frame, which never comes when the animation is paused for reduced motion
    // or the tab is in the background. Cancelling first keeps it to one loop.
    const themeWatcher = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      draw()
    })
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      cancelAnimationFrame(raf)
      themeWatcher.disconnect()
      document.removeEventListener("visibilitychange", draw)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pixelated ${className ?? ""}`} />
}
