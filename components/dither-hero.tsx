"use client"

import { useEffect, useRef } from "react"

import { hexToRgb } from "@/lib/dither"
import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"
import { valueNoise } from "@/lib/image/noise"
import { spotlight, tinted } from "@/lib/image/reveal"

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
 * How far the cursor's colour carries, and the noise its edge dissolves
 * through. A separate, finer field than the density grain: this one wants to
 * speckle the boundary rather than blotch it.
 */
const REVEAL_REACH = 120
const REVEAL_CELL = 1
const REVEAL_SEED = 0x9a17

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
  let palette = { ink: "#ff3d0f", paper: "#0e0e0d", dot: "#8d8981" }

  return () => {
    const root = document.documentElement
    if (root.className === key) return palette

    key = root.className
    const styles = getComputedStyle(root)
    palette = {
      ink: styles.getPropertyValue("--signal").trim() || "#ff3d0f",
      paper: styles.getPropertyValue("--card").trim() || "#0e0e0d",
      dot: styles.getPropertyValue("--muted-foreground").trim() || "#8d8981",
    }
    return palette
  }
}

/**
 * The empty state runs the real engine.
 *
 * A field of dots, dithered by the same Floyd-Steinberg pass a photograph gets,
 * sitting muted until the cursor passes over and colours what it reaches.
 *
 * The reveal's edge is thresholded against noise rather than a fixed radius,
 * which is what dissolves it: across the transition the accent thins into
 * scattered dots instead of ending on a drawn circle. Both noise fields are
 * generated once and never regenerated, so nothing crawls between frames.
 *
 * Nothing moves on its own, so there is no animation loop — the canvas is
 * repainted only when the pointer moves or the theme changes.
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

    const grain = valueNoise(WIDTH, HEIGHT, DOT_CELL, DOT_SEED)
    const edge = valueNoise(WIDTH, HEIGHT, REVEAL_CELL, REVEAL_SEED)

    // Which dots take the accent. Decided before dithering, while it is still
    // known where the cursor is — once dithered, a lit pixel is only lit.
    const accent = new Uint8Array(WIDTH * HEIGHT)

    const readTheme = themeReader()
    const pointer = { x: 0, y: 0, active: false }

    const paint = () => {
      const { ink, paper, dot } = readTheme()
      const data = field.data

      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          const p = y * WIDTH + x

          const n = grain[p]
          const density = DOT_FLOOR + n * Math.sqrt(n) * DOT_RANGE

          let hover = 0
          if (pointer.active) {
            const dx = x - pointer.x
            const dy = y - pointer.y
            hover = spotlight(dx * dx + dy * dy, REVEAL_REACH)
          }
          accent[p] = tinted(hover, edge[p]) ? 1 : 0

          const value = density * 255
          const i = p * 4
          data[i] = value
          data[i + 1] = value
          data[i + 2] = value
          data[i + 3] = 255
        }
      }

      ctx.putImageData(field, 0, 0)

      // Dither in plain black and white, then recolour.
      //
      // Handing a colour straight to the ditherer as a duotone looked tidier but
      // bent the result: an accent's luminance is nowhere near zero, so every
      // solid pixel emitted a large quantisation error that error diffusion
      // carried down and to the right, smearing the field. Against black and
      // white there is no such error.
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

      const [inkR, inkG, inkB] = hexToRgb(ink)
      const [paperR, paperG, paperB] = hexToRgb(paper)
      const [dotR, dotG, dotB] = hexToRgb(dot)
      const pixels = image.data

      for (let p = 0, i = 0; i < pixels.length; i += 4, p++) {
        const lit = pixels[i] > 127
        pixels[i] = lit ? (accent[p] ? inkR : dotR) : paperR
        pixels[i + 1] = lit ? (accent[p] ? inkG : dotG) : paperG
        pixels[i + 2] = lit ? (accent[p] ? inkB : dotB) : paperB
      }

      out.putImageData(image, 0, 0)
    }

    // Coalesce repaints to one per frame while the pointer is moving. The timer
    // races the frame because frame callbacks never fire in a hidden tab, which
    // would otherwise leave the canvas blank until it was foregrounded.
    let frame = 0
    let timer = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)

      let spent = false
      const run = () => {
        if (spent) return
        spent = true
        paint()
      }

      frame = requestAnimationFrame(run)
      timer = window.setTimeout(run, 32)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = display.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointer.x = ((event.clientX - rect.left) / rect.width) * WIDTH
      pointer.y = ((event.clientY - rect.top) / rect.height) * HEIGHT
      pointer.active = true
      schedule()
    }

    const onPointerLeave = () => {
      pointer.active = false
      schedule()
    }

    paint()

    display.addEventListener("pointermove", onPointerMove)
    display.addEventListener("pointerleave", onPointerLeave)
    const themeWatcher = new MutationObserver(schedule)
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    document.addEventListener("visibilitychange", paint)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      themeWatcher.disconnect()
      document.removeEventListener("visibilitychange", paint)
      display.removeEventListener("pointermove", onPointerMove)
      display.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pixelated ${className ?? ""}`} />
}
