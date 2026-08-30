"use client"

import { useEffect, useRef } from "react"

import { hexToRgb } from "@/lib/dither"
import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"
import { valueNoise } from "@/lib/image/noise"

const WIDTH = 420
const HEIGHT = 150

const DOT_FLOOR = 0.08
const DOT_RANGE = 0.2
const DOT_CELL = 4
const DOT_SEED = 0x5eed

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
    document.addEventListener("visibilitychange", paint)

    return () => {
      themeWatcher.disconnect()
      document.removeEventListener("visibilitychange", paint)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pixelated ${className ?? ""}`} />
}
