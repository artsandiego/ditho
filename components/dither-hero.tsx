"use client"

import { useEffect, useRef } from "react"

import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"
import { fieldAt, repulsion, shade, type Blob } from "@/lib/image/metaballs"

// Wide and shallow, to be stretched across the top of the card.
const WIDTH = 420
const HEIGHT = 150

/**
 * Two big circles, swinging toward and away from each other in opposite phase.
 *
 * Their centres close to roughly 66px apart and open back out to about 218,
 * against a combined radius of 120 — so they spend part of every cycle clearly
 * fused and the rest clearly apart, which is the whole thing worth watching.
 * The vertical drifts run at unrelated speeds so they never meet the same way
 * twice.
 */
const BALLS = [
  { x: 0.33, y: 0.48, r: 62, dx: 0.09, dy: 0.16, sx: 0.22, sy: 0.17, px: 0, py: 0.6 },
  { x: 0.67, y: 0.52, r: 58, dx: 0.09, dy: 0.15, sx: 0.22, sy: 0.21, px: Math.PI, py: 2.4 },
]

/** How far the cursor is felt, and how hard it shoves, in canvas pixels. */
const POINTER_REACH = 135
const POINTER_PUSH = 62
const EASE = 0.12

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
 * A metaball field — each blob contributing r²/d² and the sum shaded rather
 * than thresholded — goes through the same error diffusion a photograph would,
 * in the accent colour against the card. Summing the fields is what makes two
 * blobs bulge toward each other and fuse as they meet, instead of sliding past
 * as separate discs, and shading the sum rather than cutting it at the surface
 * leaves a gradient for the dither to bite into.
 *
 * On a light ground the field is inverted first, or nearest-colour hands the
 * whole background to the mid-toned accent rather than the blobs.
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

    const readTheme = themeReader()
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const pointer = { x: 0, y: 0, active: false }
    const nudge = BALLS.map(() => ({ x: 0, y: 0 }))

    let raf = 0
    let frame = 0

    const paint = () => {
      const t = still ? 0 : frame / 60
      const { ink, paper, dark } = readTheme()

      // Where each blob is this frame: its orbit, plus however far the cursor
      // has shoved it. The shove eases in and out so nothing snaps.
      const ease = still ? 1 : EASE
      const cursor = pointer.active ? pointer : null

      const blobs: Blob[] = BALLS.map((ball, index) => {
        const x = (ball.x + ball.dx * Math.cos(t * ball.sx + ball.px)) * WIDTH
        const y = (ball.y + ball.dy * Math.sin(t * ball.sy + ball.py)) * HEIGHT

        const target = repulsion({ x, y }, cursor, POINTER_REACH, POINTER_PUSH)
        const shove = nudge[index]
        shove.x += (target.x - shove.x) * ease
        shove.y += (target.y - shove.y) * ease

        return { x: x + shove.x, y: y + shove.y, radius: ball.r }
      })

      const data = field.data
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          const value = shade(fieldAt(blobs, x, y))
          const i = (y * WIDTH + x) * 4
          data[i] = value
          data[i + 1] = value
          data[i + 2] = value
          data[i + 3] = 255
        }
      }

      ctx.putImageData(field, 0, 0)

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
    }

    const loop = () => {
      paint()
      frame++
      raf = requestAnimationFrame(loop)
    }

    // With motion reduced the orbits are frozen, but the cursor still shoves
    // blobs around — that is a direct response to input, not ambient movement.
    const repaint = () => {
      if (!still) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(paint)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = display.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointer.x = ((event.clientX - rect.left) / rect.width) * WIDTH
      pointer.y = ((event.clientY - rect.top) / rect.height) * HEIGHT
      pointer.active = true
      repaint()
    }

    const onPointerLeave = () => {
      pointer.active = false
      repaint()
    }

    display.addEventListener("pointermove", onPointerMove)
    display.addEventListener("pointerleave", onPointerLeave)

    if (still) paint()
    else loop()

    const themeWatcher = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      if (still) paint()
      else loop()
    })
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    document.addEventListener("visibilitychange", paint)

    return () => {
      cancelAnimationFrame(raf)
      themeWatcher.disconnect()
      document.removeEventListener("visibilitychange", paint)
      display.removeEventListener("pointermove", onPointerMove)
      display.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pixelated ${className ?? ""}`} />
}
