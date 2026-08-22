# DITHO

A one-bit image press. Drop in a photograph, frame it, and run it through error
diffusion, an ordered screen, or a rotated halftone — in mono, duotone, or a
colour palette. Everything happens in the browser: no upload, no server, no
image ever leaves the tab.

```bash
pnpm install
pnpm dev
```

## How it works

```
File → decoded <img>
     → crop rect to a canvas (capped at 2400px)
     → downscale to the dither grid       ← the important step
     → tone curve (brightness / contrast / invert)
     → dither against a palette
     → ImageData → <canvas> scaled up with image-rendering: pixelated
```

The non-obvious part is the downscale. Dithering a 2400px photo at full
resolution produces a pattern too fine to see, and the result just reads as
grey. The image is dithered small and the canvas is scaled back up with
nearest-neighbour, which is what the **pixel size** control adjusts.

Halftone is the exception: its cells need several pixels each to draw a dot
into, so it renders on the full-resolution grid and spends that control on dot
size instead.

## Methods

| Family | Methods |
| --- | --- |
| Error diffusion | Floyd–Steinberg, Atkinson, Jarvis–Judice–Ninke, Stucki, Burkes, Sierra, Sierra Lite |
| Ordered | Bayer 2×2/4×4/8×8, clustered dot, horizontal/vertical lines, diagonal, white noise |
| Halftone | Rotatable screen with circle, square, diamond or line dots |

All seven diffusion kernels share one runner and differ only in their weight
table, so adding another is a handful of numbers in `lib/dither/kernels.ts`.

Three details that are easy to get wrong, and are deliberate here:

- **Diffusion runs in `Float32`.** Diffused error routinely pushes channels
  outside 0–255, and clamping mid-pass is the usual reason a Floyd–Steinberg
  implementation comes out looking like flat noise.
- **Atkinson's taps sum to 6 over a divisor of 8.** Throwing away a quarter of
  the error is the point — it is what holds highlights instead of muddying them.
- **Ordered dithering picks *between* two palette entries** rather than adding a
  centred offset and re-quantising. The offset approach drags values that
  already sit exactly on a palette entry off it, which speckles clean whites.

## Colour

**Duotone** keeps the two-tone maths and lets you choose the ink and paper.
**Palette** quantises against a real colour set — Game Boy, CGA, Commodore 64,
grey ramps, and others — diffusing error across R, G and B. Nearest-colour uses
luminance-weighted distance; plain Euclidean RGB over-weights blue and turns
skies muddy.

**Custom** builds a set of two to eight colours of your own. Choosing it copies
whichever palette you were on, so tweaking an existing one does not mean
retyping it — but only while the custom colours are untouched. Once edited they
are never overwritten.

Halftone sorts the palette into a luminance ramp and screens each cell between
the two levels that bracket it, so a four-colour set halftones across all four
rather than collapsing to its extremes.

## Exporting

PNG or JPG, chosen in the header. Both scale the dither grid up by whole-number
factors with smoothing off, so the file matches the preview rather than a
blurred version of it.

PNG is the right answer for this output; JPG is there because it gets asked
for. Measured on one frame, the same image comes out at 143 KB as a PNG holding
exactly two shades, and 1.5 MB as a JPG holding eighteen, with 31% of pixels
landing on neither pure ink nor pure paper. Hard black-and-white edges are
precisely what a DCT handles worst, so the format both bloats and rings even at
quality 0.95.

## Theming

Light and dark via `next-themes`, remembered across visits. Dark is the default
outright rather than merely the fallback for anyone whose system has not asked
for light. The palette lives entirely in CSS variables, so the whole
interface follows from two blocks in `app/globals.css`.

The hero on the empty state reads its two colours from those same
variables. It watches the theme class on `<html>` rather than a React value:
keying it on the latter raced next-themes updating the DOM, and the canvas kept
painting in the colours of the theme it had just left.

That hero is a field of dots put through the same Floyd–Steinberg pass a
photograph gets, in ink on paper. Nothing moves and nothing responds — it is
painted once, and again only when the theme changes.

Its density comes from a seeded value-noise lattice, smoothly interpolated,
which is what makes it read as grain rather than as an even screen. Per-pixel
randomness was the obvious approach and the wrong one: dithered, it flattens
into static with no structure, and regenerated each frame it would crawl.

The dither itself runs in plain black and white and the result is recoloured
afterwards. Handing the theme's colours straight to the ditherer as a duotone
is tidier but bends the result: an ink whose luminance is nowhere near zero
makes every solid pixel emit a large quantisation error, which error diffusion
carries down and to the right, smearing the field.

## Inspecting the result

Scroll or pinch over the preview to zoom, drag to pan, double-click or **Fit**
to reset. The range runs from a fifth of the fit up to 24×, so the frame can be
pushed back and judged as a picture as readily as it can be pulled in to count
cells. It is view-only: the dither and the exported PNG are unaffected.

Panning writes straight to the element rather than going through React state,
so dragging does not re-render the tree on every pointer move. The view
survives a change of method or cell size — the point is comparing two settings
at the same magnification — and resets on a new crop.

## Layout

| Path | What lives there |
| --- | --- |
| `lib/dither/kernels.ts`, `diffusion.ts` | Error-diffusion weights and their shared runner |
| `lib/dither/matrices.ts`, `ordered.ts` | Threshold matrices and the ordered runner |
| `lib/dither/halftone.ts` | Analytic rotated halftone screen |
| `lib/dither/palette.ts` | Palettes, nearest-colour, bracketing |
| `lib/dither/pipeline.ts` | Cropped canvas in, dithered `ImageData` out |
| `lib/image/` | Loading, cropping, progressive downscaling, PNG and JPG export |
| `lib/image/fit.ts` | Letterboxing and pan/zoom maths, kept pure and tested |
| `lib/image/noise.ts` | The value noise the hero's grain is built from |
| `hooks/use-dithered-image.ts` | Re-renders on change, coalesced to one per frame |
| `components/method-controls.tsx` | Left panel: how the dither is computed |
| `components/style-controls.tsx` | Right panel: how it looks |

Every kernel takes a plain `{ data, width, height }` and is free of DOM calls,
so they run under Node in tests and would move to a Web Worker unchanged.

## Performance

Measured on an M-series Mac, per render:

| Setting | Time |
| --- | --- |
| Defaults (400×225 grid, mono) | ~4 ms |
| Pixel size 1 (1200×675), mono | ~40 ms |
| Pixel size 1, 16-colour palette | ~80 ms |
| Halftone, full grid | ~31 ms |

Renders are coalesced to one per animation frame, so dragging a slider stays
responsive at ordinary settings. The corner case — finest grain *and* a large
palette — is visibly slower; moving the kernels into a Web Worker is the fix if
that becomes worth doing.

## Adding a method

Implement `DitherMethod` from `lib/dither/types.ts` and add it to the registry
in `lib/dither/index.ts`:

```ts
apply(image: Bitmap, options: MethodOptions): Bitmap
```

For a new error-diffusion variant there is less to do — add its taps and
divisor to `KERNELS` and it appears in the menu automatically.

## Checks

```bash
pnpm test        # kernel correctness
pnpm typecheck
pnpm lint
pnpm build
```
