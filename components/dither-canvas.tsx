"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { DitherResult } from "@/lib/dither/pipeline"
import { context2d } from "@/lib/image/canvas"
import { clampPan, letterbox, zoomAbout } from "@/lib/image/fit"

const MIN_ZOOM = 0.2
const MAX_ZOOM = 24
const FIT_ZOOM = 1

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

/**
 * The canvas backing store stays at the dither resolution and CSS does the
 * scaling, so `image-rendering: pixelated` gives a nearest-neighbour blow-up
 * for free. A canvas stretches its bitmap to whatever box it is given, which is
 * also what makes non-square cells work: the grid stops matching the
 * photograph's proportions on purpose, and the box puts them back.
 *
 * The fit is measured directly rather than left to CSS. `aspect-ratio`
 * alongside a definite width cannot shrink that width when `max-height` clamps
 * the height, so the box quietly stretches instead of letterboxing, and
 * `object-fit` is no help either — it fits to the bitmap's own ratio.
 *
 * Zoom is inspection only — it never touches the dither or the export. It runs
 * from a fifth of the fit up to 24x, so the whole frame can be pushed back to
 * judge it as a picture as readily as it can be pulled in to count cells. The
 * view lives in refs and is written straight to the element: panning should not
 * re-render the tree on every pointer move.
 *
 * The view deliberately survives a change of method or cell size, so two
 * settings can be compared at the same magnification. A new crop is a different
 * photograph and gets a fresh view — the caller keys this component on the crop
 * to say so, rather than this component reaching for the reset itself.
 */
export function DitherCanvas({ result }: { result: DitherResult | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const view = useRef({ zoom: 1, x: 0, y: 0 })
  const aspect = useRef<number | null>(null)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)

  // Mirrored purely so the readout and the buttons can render.
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)

  const layout = useCallback(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box || aspect.current === null) return

    const rect = box.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const base = letterbox(rect, aspect.current)
    const width = base.width * view.current.zoom
    const height = base.height * view.current.zoom

    view.current.x = clampPan(view.current.x, width, rect.width)
    view.current.y = clampPan(view.current.y, height, rect.height)

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.style.transform = `translate(${view.current.x}px, ${view.current.y}px)`
    canvas.style.opacity = "1"
  }, [])

  const applyZoom = useCallback(
    (next: number, pointerX?: number, pointerY?: number) => {
      const box = boxRef.current
      if (!box) return

      const previous = view.current.zoom
      const target = clampZoom(next)
      if (target === previous) return

      const rect = box.getBoundingClientRect()
      const px = pointerX ?? rect.width / 2
      const py = pointerY ?? rect.height / 2

      view.current.x = zoomAbout(view.current.x, px, previous, target)
      view.current.y = zoomAbout(view.current.y, py, previous, target)
      view.current.zoom = target

      setZoom(target)
      layout()
    },
    [layout],
  )

  const resetView = useCallback(() => {
    view.current = { zoom: FIT_ZOOM, x: 0, y: 0 }
    setZoom(FIT_ZOOM)
    layout()
  }, [layout])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!result) {
      canvas.style.opacity = "0"
      return
    }

    aspect.current = result.aspect
    canvas.width = result.image.width
    canvas.height = result.image.height
    context2d(canvas).putImageData(result.image, 0, 0)
    layout()
  }, [result, layout])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    // Attached natively because preventDefault needs a non-passive listener,
    // and React's synthetic wheel handler is passive.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = box.getBoundingClientRect()
      // Trackpad pinch arrives as ctrl+wheel, and line-mode deltas are ~16x
      // coarser than pixel-mode ones.
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1)
      const rate = event.ctrlKey ? 0.01 : 0.0025
      applyZoom(
        view.current.zoom * Math.exp(-delta * rate),
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
    }

    box.addEventListener("wheel", onWheel, { passive: false })

    // Two listeners because neither alone is enough: a ResizeObserver catches
    // the panel changing width without the window moving, but stops delivering
    // while the tab is hidden, and comes back only once it is shown again.
    const observer = new ResizeObserver(layout)
    observer.observe(box)
    window.addEventListener("resize", layout)

    return () => {
      box.removeEventListener("wheel", onWheel)
      observer.disconnect()
      window.removeEventListener("resize", layout)
    }
  }, [layout, applyZoom])

  const startPan = (event: React.PointerEvent) => {
    // Below the fit there is nothing to pan to — the image sits centred with
    // room to spare on both axes.
    if (view.current.zoom <= FIT_ZOOM || !boxRef.current) return
    boxRef.current.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    setPanning(true)
  }

  const movePan = (event: React.PointerEvent) => {
    const active = drag.current
    if (!active || active.id !== event.pointerId) return

    view.current.x += event.clientX - active.x
    view.current.y += event.clientY - active.y
    active.x = event.clientX
    active.y = event.clientY
    layout()
  }

  const endPan = (event: React.PointerEvent) => {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    setPanning(false)
  }

  const zoomable = result !== null
  const cursor =
    !zoomable || zoom <= FIT_ZOOM ? "" : panning ? "cursor-grabbing" : "cursor-grab"
  const fitted = Math.abs(zoom - FIT_ZOOM) < 0.001

  return (
    <div className="relative h-full w-full">
      <div
        ref={boxRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onDoubleClick={resetView}
        className={`h-full w-full touch-none overflow-hidden ${cursor}`}
      >
        <canvas
          ref={canvasRef}
          className="pixelated block origin-top-left opacity-0 transition-opacity duration-150"
        />
      </div>

      {zoomable && (
        <div className="floating absolute bottom-0 right-0 flex items-stretch overflow-hidden rounded-lg text-[10px]">
          <button
            type="button"
            onClick={() => applyZoom(view.current.zoom / 1.6)}
            disabled={zoom <= MIN_ZOOM + 0.001}
            aria-label="Zoom out"
            className="w-7 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
          >
            −
          </button>
          <span className="w-12 border-x border-border py-1.5 text-center tabular-nums text-signal">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => applyZoom(view.current.zoom * 1.6)}
            disabled={zoom >= MAX_ZOOM - 0.001}
            aria-label="Zoom in"
            className="w-7 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetView}
            disabled={fitted}
            className="border-l border-border px-2.5 py-1.5 uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
          >
            Fit
          </button>
        </div>
      )}
    </div>
  )
}
