/**
 * The Ditho mark.
 *
 * Inlined rather than loaded from `public/assets/light.svg` and `dark.svg`,
 * which carry the same four paths with baked-in fills. Drawing it with
 * `currentColor` means one shape serves both themes — no second request, no
 * swap to flash on a theme change, and it inherits hover colour from the button
 * around it. Those two files remain the source the paths came from; if the mark
 * is redrawn, copy the new `d` attributes across.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 721"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M0 0L180.024 0.00343148V720.003H0.0240031L0 0Z" />
      <path d="M540 180.014H720V540.014H540V180.014Z" />
      <path d="M540 0.0140625V180.014L180 180.014L180 0.0140468L540 0.0140625Z" />
      <path d="M540 540.014V720.014H180L180 540.014H540Z" />
    </svg>
  )
}
