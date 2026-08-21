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

Halftone sorts the palette into a luminance ramp and screens each cell between
the two levels that bracket it, so a four-colour set halftones across all four
rather than collapsing to its extremes.

## Layout

| Path | What lives there |
| --- | --- |
| `lib/dither/kernels.ts`, `diffusion.ts` | Error-diffusion weights and their shared runner |
| `lib/dither/matrices.ts`, `ordered.ts` | Threshold matrices and the ordered runner |
| `lib/dither/halftone.ts` | Analytic rotated halftone screen |
| `lib/dither/palette.ts` | Palettes, nearest-colour, bracketing |
| `lib/dither/pipeline.ts` | Cropped canvas in, dithered `ImageData` out |
| `lib/image/` | Loading, cropping, progressive downscaling, PNG export |
| `hooks/use-dithered-image.ts` | Re-renders on change, coalesced to one per frame |

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
