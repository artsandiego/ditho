# DITHO

A one-bit image press. Drop in a photograph, frame it, and run it through
Floyd–Steinberg error diffusion. Everything happens in the browser — no upload,
no server, no image ever leaves the tab.

```bash
pnpm install
pnpm dev
```

## How it works

```
File → decoded <img>
     → crop rect to a canvas (capped at 2400px)
     → downscale to the dither grid       ← the important step
     → luminance → contrast → Floyd–Steinberg
     → ImageData → <canvas> upscaled with image-rendering: pixelated
```

The non-obvious part is the downscale. Dithering a 2400px photo at full
resolution produces a pattern too fine to see, and the result just reads as
grey. The image is dithered small and the canvas is scaled back up with
nearest-neighbour, which is what the **pixel size** control adjusts.

Error diffusion runs over a `Float32Array`. Diffused error regularly pushes
values outside 0–255, and clamping mid-pass is the usual reason a
Floyd–Steinberg implementation comes out looking like flat noise.

## Layout

| Path | What lives there |
| --- | --- |
| `lib/dither/` | The kernel, luminance/contrast, and the algorithm registry. Pure, no DOM |
| `lib/dither/pipeline.ts` | Cropped canvas in, one-bit `ImageData` out |
| `lib/image/` | Loading, cropping, progressive downscaling, PNG export |
| `hooks/use-dithered-image.ts` | Re-renders on change, coalesced to one render per frame |
| `components/` | Dropzone, cropper, canvas, control panel |

## Adding an algorithm

Implement `DitherAlgorithm` from `lib/dither/types.ts`:

```ts
apply(gray: Float32Array, width: number, height: number, options: DitherOptions): Uint8ClampedArray
```

Add it to the registry in `lib/dither/index.ts`. Ordered/Bayer, Atkinson and
blue-noise all fit this signature, and nothing in the pipeline or the UI needs
to change.

## Checks

```bash
pnpm test        # Floyd–Steinberg kernel correctness
pnpm typecheck
pnpm lint
pnpm build
```
