"use client"

import { useEffect, useRef } from "react"

import { hexToRgb } from "@/lib/dither"
import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"
import { valueNoise } from "@/lib/image/noise"

// Wide and shallow, to be stretched across the top of the card.
const WIDTH = 420
const HEIGHT = 150

/**
 * Density of the dot field, as ink coverage.
 *
 * A floor plus a range, because those are the two things worth controlling: the
 * floor sets how present the field is at its thinnest, the range how far it
 * drifts. The noise is skewed low so most of the panel sits near the floor with
 * occasional denser patches, which reads as grain rather than as an even screen.
 */
const DOT_FLOOR = 0.08
const DOT_RANGE = 0.2
const DOT_CELL = 4
const DOT_SEED = 0x5eed

/**
 * Ink and paper straight from the stylesheet, re-read only when the theme class
 * actually changes.
 *
 * Reading these in an effect keyed on the theme looked simpler but was a race:
 * the effect could run before next-themes had swapped the class on <html>, so
 * the canvas kept painting in the colors of the theme just left. Keying off
 * the live class instead cannot get out of step, whatever order things run in.
 */
function themeReader() {
  let key = ""
  let palette = { dot: "#f3f1ea", paper: "#0e0e0d" }

  return () => {
    const root = document.documentElement
    if (root.className === key) return palette

    key = root.className
    const styles = getComputedStyle(root)
    palette = {
      dot: styles.getPropertyValue("--foreground").trim() || "#f3f1ea",
      paper: styles.getPropertyValue("--card").trim() || "#0e0e0d",
    }
    return palette
  }
}

/**
 * The empty state runs the real engine.
 *
 * A field of dots put through the same Floyd-Steinberg pass a photograph gets,
 * in ink on paper. Its density comes from a seeded value-noise lattice, which
 * is what makes it read as grain rather than as an even screen — per-pixel
 * randomness flattens into static once dithered, and being regenerated each
 * frame it would crawl.
 *
 * Nothing moves, so there is no loop and no interaction: the canvas is painted
 * once and then only when the theme changes.
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
    const field = ctx.createImageData(WIDTH, HEIGHT)

    // Static: the grain is the paper, so it must not crawl between frames.
    const grain = valueNoise(WIDTH, HEIGHT, DOT_CELL, DOT_SEED)
    const readTheme = themeReader()

    const paint = () => {
      const { dot, paper } = readTheme()
      const data = field.data

      for (let p = 0; p < grain.length; p++) {
        const n = grain[p]
        const value = (DOT_FLOOR + n * Math.sqrt(n) * DOT_RANGE) * 255
        const i = p * 4
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = 255
      }

      ctx.putImageData(field, 0, 0)

      // Dither in plain black and white, then recolor.
      //
      // Handing the theme's colors straight to the ditherer as a duotone looked
      // tidier but bent the result: an ink whose luminance is nowhere near zero
      // makes every solid pixel emit a large quantisation error, which error
      // diffusion carries down and to the right, smearing the field. Against
      // black and white there is no such error.
      const image = renderDither(source, {
        ...DEFAULT_SETTINGS,
        pixelSize: 1,
        contrast: 0,
        serpentine: false,
        colorMode: "duotone",
        ink: "#000000",
        paper: "#ffffff",
        invert: false,
      }).image

      const [dotR, dotG, dotB] = hexToRgb(dot)
      const [paperR, paperG, paperB] = hexToRgb(paper)
      const pixels = image.data

      for (let i = 0; i < pixels.length; i += 4) {
        const lit = pixels[i] > 127
        pixels[i] = lit ? dotR : paperR
        pixels[i + 1] = lit ? dotG : paperG
        pixels[i + 2] = lit ? dotB : paperB
      }

      out.putImageData(image, 0, 0)
    }

    paint()

    const themeWatcher = new MutationObserver(paint)
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    // Frame callbacks never fire in a hidden tab, so a canvas first painted
    // there can come up blank; repaint when it is shown.
    document.addEventListener("visibilitychange", paint)

    return () => {
      themeWatcher.disconnect()
      document.removeEventListener("visibilitychange", paint)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pixelated ${className ?? ""}`} />
}
