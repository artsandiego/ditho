"use client"

import { useEffect, useRef } from "react"

import { hexToRgb } from "@/lib/dither"
import { DEFAULT_SETTINGS, renderDither } from "@/lib/dither/pipeline"
import { context2d, createCanvas } from "@/lib/image/canvas"
import { attraction, fieldAt, shade, SURFACE, type Blob } from "@/lib/image/metaballs"
import { valueNoise } from "@/lib/image/noise"

// Wide and shallow, to be stretched across the top of the card.
const WIDTH = 420
const HEIGHT = 150

/**
 * Three circles at distinctly different sizes, drifting in and out of each
 * other's reach. The middle one runs in counter-phase to the outer two, so the
 * group keeps closing up and opening out rather than sliding along together.
 *
 * Sizing has to allow for the dithered falloff, not just the circle: the
 * shading band carries visible texture out to about 1.27 radii. The large one
 * lets that band run off the top and bottom, which is a soft fade rather than a
 * cut so long as its solid core stays inside — hence its smaller vertical
 * drift, which keeps that core clear of the edges.
 */
const BALLS = [
  // xxl — at the ceiling of what the banner's height allows before its solid
  // core starts running off the edges, so it holds still vertically.
  { x: 0.3, y: 0.5, r: 72, dx: 0.06, dy: 0.01, sx: 0.48, sy: 0.35, px: 0, py: 0.6 },
  // l
  { x: 0.6, y: 0.44, r: 42, dx: 0.07, dy: 0.05, sx: 0.58, sy: 0.45, px: Math.PI, py: 2.4 },
  // m
  { x: 0.84, y: 0.58, r: 26, dx: 0.06, dy: 0.07, sx: 0.48, sy: 0.4, px: 0, py: 4.1 },
]

/**
 * A grain laid under the blobs so the paper carries texture instead of reading
 * as flat colour.
 *
 * Expressed as a floor plus a range rather than one amount, because those are
 * the two things worth controlling: the floor keeps a light speckle everywhere,
 * the range decides how far it drifts. Both are tiny — this lands around 1% ink
 * at its lightest, 3% typical and 8% at its densest, which is texture you only
 * notice once it is gone. The veil below keeps it clear of the circles.
 */
const TEXTURE_FLOOR = 0.104
const TEXTURE_RANGE = 0.052
const TEXTURE_CELL = 4
const TEXTURE_SEED = 0x5eed

/** How much of the gap to the cursor a blob closes, and how far it may travel. */
const FOLLOW_FRACTION = 0.55
const FOLLOW_LIMIT = 110
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
  let palette = { ink: "#ff3d0f", paper: "#0e0e0d" }

  return () => {
    const root = document.documentElement
    if (root.className === key) return palette

    key = root.className
    const styles = getComputedStyle(root)
    palette = {
      ink: styles.getPropertyValue("--signal").trim() || "#ff3d0f",
      paper: styles.getPropertyValue("--card").trim() || "#0e0e0d",
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
    const grain = valueNoise(WIDTH, HEIGHT, TEXTURE_CELL, TEXTURE_SEED)

    const readTheme = themeReader()
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const pointer = { x: 0, y: 0, active: false }
    const nudge = BALLS.map(() => ({ x: 0, y: 0 }))

    let raf = 0
    let frame = 0

    const paint = () => {
      const t = still ? 0 : frame / 60
      const { ink, paper } = readTheme()

      // Where each blob is this frame: its orbit, plus however far the cursor
      // has drawn it in. The pull eases in and out so nothing snaps, and the
      // easing is what gives the group its lag as it gathers.
      const ease = still ? 1 : EASE
      const cursor = pointer.active ? pointer : null

      const blobs: Blob[] = BALLS.map((ball, index) => {
        const x = (ball.x + ball.dx * Math.cos(t * ball.sx + ball.px)) * WIDTH
        const y = (ball.y + ball.dy * Math.sin(t * ball.sy + ball.py)) * HEIGHT

        const target = attraction({ x, y }, cursor, FOLLOW_FRACTION, FOLLOW_LIMIT)
        const pull = nudge[index]
        pull.x += (target.x - pull.x) * ease
        pull.y += (target.y - pull.y) * ease

        return { x: x + pull.x, y: y + pull.y, radius: ball.r }
      })

      const data = field.data
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          const p = y * WIDTH + x
          const strength = fieldAt(blobs, x, y)

          // Full grain on bare paper, none at all by the time the field reaches
          // a blob's surface. Letting it run all the way in would wobble the
          // very outlines the compact kernel exists to keep circular.
          const veil = strength >= SURFACE ? 0 : 1 - strength / SURFACE
          // Skewed low rather than used flat, so the grain is mostly faint with
          // occasional denser specks instead of sitting evenly at its midpoint.
          const n = grain[p]
          const texture = TEXTURE_FLOOR + n * Math.sqrt(n) * TEXTURE_RANGE
          const value = shade(strength + texture * veil)

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
      // Handing the accent straight to the ditherer as a duotone looked
      // tidier but bent the shape: the accent's luminance is nowhere near
      // zero, so every solid pixel emitted a large quantisation error that
      // error diffusion carried down and to the right, smearing a circle into
      // a lopsided blob with one flat edge. Against black and white there is
      // no such error, so the circle stays a circle whatever colour it ends up.
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
      const pixels = image.data
      for (let i = 0; i < pixels.length; i += 4) {
        const lit = pixels[i] > 127
        pixels[i] = lit ? inkR : paperR
        pixels[i + 1] = lit ? inkG : paperG
        pixels[i + 2] = lit ? inkB : paperB
      }

      out.putImageData(image, 0, 0)
    }

    const loop = () => {
      paint()
      frame++
      raf = requestAnimationFrame(loop)
    }

    // With motion reduced the orbits are frozen, but the cursor still draws
    // blobs to it — that is a direct response to input, not ambient movement.
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
