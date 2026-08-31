# Ditho

## Hard constraints

- This app has NO server. No API routes, no database, no auth, no middleware.
  Every pixel is processed in the browser. If a feature seems to need a server,
  it does not belong in Ditho.
- `lib/` is pure and DOM-free, except `lib/image/canvas.ts`. That is what makes
  it testable under Node. Keep it that way.
- `mediabunny` and `react-easy-crop` are loaded on demand, not at the top level.
  They are 476 KB of first-load JS if a static import creeps back in.

## The pipeline

File -> decoded <img> -> crop to canvas (capped 2400px)
     -> downscale to the dither grid   <- cached, keyed on source identity
     -> tone curve -> dither against a palette
     -> ImageData -> canvas scaled up with image-rendering: pixelated

## Invariants that look like bugs

- Dither small, scale up. Dithering at full resolution makes a pattern too fine
  to see and reads as grey. Do not "fix" this.
- Diffusion runs in Float32 and must not clamp mid-pass.
- Atkinson's taps sum to 6 over a divisor of 8. Throwing away a quarter of the
  error is deliberate.
- Ordered dithering picks BETWEEN two palette entries. It does not add a centred
  offset and re-quantise.
- A preset never carries the colours read off an image. They belong to the
  photograph, not the look.

## Conventions

- The source carries no comments. Do not add them.
- Tests: vitest, node environment, `*.test.ts` beside the source. A new kernel
  needs a test.
- Before claiming done: pnpm typecheck && pnpm lint && pnpm test && pnpm build
- This repo is public. Keep PR descriptions short and plain: what changed and
  why, a few lines. Never paste raw logs, terminal output or absolute paths.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
